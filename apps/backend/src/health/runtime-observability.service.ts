import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type RouteBucket = {
  count: number;
  errorCount: number;
  totalDurationMs: number;
  maxDurationMs: number;
  slowCount: number;
  histogram: number[];
};

type RouteAggregate = {
  route: string;
  count: number;
  errorCount: number;
  averageDurationMs: number;
  maxDurationMs: number;
  approximateP95Ms: number;
  slowCount: number;
};

@Injectable()
export class RuntimeObservabilityService {
  private readonly logger = new Logger(RuntimeObservabilityService.name);
  private readonly routeBuckets = new Map<string, Map<number, RouteBucket>>();
  private readonly histogramBounds = [
    50,
    100,
    250,
    500,
    1000,
    2000,
    5000,
    Infinity,
  ];
  private readonly bucketWindowMs = 60_000;
  private readonly maxWindowMs: number;
  private readonly slowRequestWarnMs: number;
  private readonly degradedP95Ms: number;
  private readonly degradedErrorRatePercent: number;
  private readonly minRequestCount: number;

  constructor(private readonly config: ConfigService) {
    this.maxWindowMs = this.config.get<number>('API_HEALTH_WINDOW_MS', 300_000);
    this.slowRequestWarnMs = this.config.get<number>(
      'API_SLOW_REQUEST_WARN_MS',
      1000,
    );
    this.degradedP95Ms = this.config.get<number>(
      'API_HEALTH_P95_DEGRADED_MS',
      1000,
    );
    this.degradedErrorRatePercent = this.config.get<number>(
      'API_HEALTH_ERROR_RATE_DEGRADED_PERCENT',
      5,
    );
    this.minRequestCount = this.config.get<number>(
      'API_HEALTH_MIN_REQUEST_COUNT',
      20,
    );
  }

  recordHttpRequest(
    route: string,
    statusCode: number,
    durationMs: number,
  ): void {
    const normalizedRoute = route.trim();

    if (!normalizedRoute || normalizedRoute.includes('/health')) {
      return;
    }

    const bucketKey =
      Math.floor(Date.now() / this.bucketWindowMs) * this.bucketWindowMs;
    const routeMap =
      this.routeBuckets.get(normalizedRoute) ?? new Map<number, RouteBucket>();
    const bucket =
      routeMap.get(bucketKey) ??
      ({
        count: 0,
        errorCount: 0,
        totalDurationMs: 0,
        maxDurationMs: 0,
        slowCount: 0,
        histogram: new Array<number>(this.histogramBounds.length).fill(0),
      } satisfies RouteBucket);

    bucket.count += 1;
    bucket.totalDurationMs += durationMs;
    bucket.maxDurationMs = Math.max(bucket.maxDurationMs, durationMs);

    if (statusCode >= 500) {
      bucket.errorCount += 1;
    }

    if (durationMs >= this.slowRequestWarnMs) {
      bucket.slowCount += 1;
      this.logger.warn(
        `Slow request route="${normalizedRoute}" durationMs=${durationMs.toFixed(
          1,
        )} statusCode=${statusCode}`,
      );
    }

    const histogramIndex = this.histogramBounds.findIndex(
      (upperBound) => durationMs <= upperBound,
    );
    bucket.histogram[Math.max(histogramIndex, 0)] += 1;

    routeMap.set(bucketKey, bucket);
    this.routeBuckets.set(normalizedRoute, routeMap);
    this.pruneExpiredBuckets();
  }

  getApiPerformanceSnapshot(): {
    status: 'up' | 'degraded';
    message: string;
    details: Record<string, unknown>;
  } {
    this.pruneExpiredBuckets();

    const routeAggregates = Array.from(this.routeBuckets.entries())
      .map(([route, bucketMap]) => this.aggregateRoute(route, bucketMap))
      .filter((aggregate): aggregate is RouteAggregate => aggregate !== null);

    const totals = routeAggregates.reduce(
      (acc, aggregate) => {
        acc.count += aggregate.count;
        acc.errorCount += aggregate.errorCount;
        acc.totalDurationMs += aggregate.averageDurationMs * aggregate.count;
        acc.maxDurationMs = Math.max(
          acc.maxDurationMs,
          aggregate.maxDurationMs,
        );
        acc.slowCount += aggregate.slowCount;
        return acc;
      },
      {
        count: 0,
        errorCount: 0,
        totalDurationMs: 0,
        maxDurationMs: 0,
        slowCount: 0,
      },
    );

    if (totals.count === 0) {
      return {
        status: 'up',
        message: 'No recent API traffic recorded in the performance window.',
        details: {
          windowMs: this.maxWindowMs,
          routeCount: 0,
        },
      };
    }

    const approximateP95Ms = routeAggregates.reduce(
      (max, aggregate) => Math.max(max, aggregate.approximateP95Ms),
      0,
    );
    const errorRatePercent = (totals.errorCount / totals.count) * 100;
    const averageDurationMs = totals.totalDurationMs / totals.count;
    const status =
      totals.count >= this.minRequestCount &&
      (approximateP95Ms >= this.degradedP95Ms ||
        errorRatePercent >= this.degradedErrorRatePercent)
        ? 'degraded'
        : 'up';

    return {
      status,
      message:
        status === 'degraded'
          ? 'Recent API traffic indicates elevated latency or server error rate.'
          : 'Recent API traffic is within the configured performance thresholds.',
      details: {
        windowMs: this.maxWindowMs,
        requestCount: totals.count,
        averageDurationMs: Number(averageDurationMs.toFixed(1)),
        approximateP95Ms,
        maxDurationMs: Number(totals.maxDurationMs.toFixed(1)),
        slowRequestCount: totals.slowCount,
        errorRatePercent: Number(errorRatePercent.toFixed(2)),
        thresholds: {
          degradedP95Ms: this.degradedP95Ms,
          degradedErrorRatePercent: this.degradedErrorRatePercent,
          minRequestCount: this.minRequestCount,
        },
        hottestRoutes: routeAggregates
          .sort((a, b) => b.approximateP95Ms - a.approximateP95Ms)
          .slice(0, 5),
      },
    };
  }

  private aggregateRoute(
    route: string,
    bucketMap: Map<number, RouteBucket>,
  ): RouteAggregate | null {
    const relevantBuckets = Array.from(bucketMap.entries()).filter(
      ([bucketKey]) => Date.now() - bucketKey <= this.maxWindowMs,
    );

    if (!relevantBuckets.length) {
      return null;
    }

    const aggregate = relevantBuckets.reduce(
      (acc, [, bucket]) => {
        acc.count += bucket.count;
        acc.errorCount += bucket.errorCount;
        acc.totalDurationMs += bucket.totalDurationMs;
        acc.maxDurationMs = Math.max(acc.maxDurationMs, bucket.maxDurationMs);
        acc.slowCount += bucket.slowCount;
        bucket.histogram.forEach((count, index) => {
          acc.histogram[index] += count;
        });
        return acc;
      },
      {
        count: 0,
        errorCount: 0,
        totalDurationMs: 0,
        maxDurationMs: 0,
        slowCount: 0,
        histogram: new Array<number>(this.histogramBounds.length).fill(0),
      },
    );

    if (aggregate.count === 0) {
      return null;
    }

    return {
      route,
      count: aggregate.count,
      errorCount: aggregate.errorCount,
      averageDurationMs: aggregate.totalDurationMs / aggregate.count,
      maxDurationMs: aggregate.maxDurationMs,
      slowCount: aggregate.slowCount,
      approximateP95Ms: this.estimatePercentileFromHistogram(
        aggregate.histogram,
        0.95,
      ),
    };
  }

  private estimatePercentileFromHistogram(
    histogram: number[],
    percentile: number,
  ): number {
    const total = histogram.reduce((sum, count) => sum + count, 0);

    if (!total) {
      return 0;
    }

    const target = Math.ceil(total * percentile);
    let cumulative = 0;

    for (let index = 0; index < histogram.length; index += 1) {
      cumulative += histogram[index];
      if (cumulative >= target) {
        const bound = this.histogramBounds[index];
        return Number.isFinite(bound) ? bound : this.histogramBounds[index - 1];
      }
    }

    return this.histogramBounds[this.histogramBounds.length - 2];
  }

  private pruneExpiredBuckets(): void {
    const cutoff = Date.now() - this.maxWindowMs;

    for (const [route, bucketMap] of this.routeBuckets.entries()) {
      for (const bucketKey of bucketMap.keys()) {
        if (bucketKey < cutoff) {
          bucketMap.delete(bucketKey);
        }
      }

      if (bucketMap.size === 0) {
        this.routeBuckets.delete(route);
      }
    }
  }
}
