"use client";

import { Check } from "lucide-react";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

type Demo = {
  value: string;
  label: string;
  description: string;
  bullets: string[];
  highlightedCode: string;
};

export function ApiTabsClient({ demos }: { demos: Demo[] }) {
  return (
    <Tabs
      defaultValue={demos[0].value}
      orientation="vertical"
      className="recipe-tabs grid! min-w-0 gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20"
    >
      <div>
        <p className="eyebrow">Workflow recipes</p>
        <h3 className="mt-8 max-w-md text-3xl font-semibold tracking-normal text-ink md:text-4xl">
          Compose Signa around the way you already work
        </h3>
        <p className="mt-3 max-w-md text-base text-copy">
          Use the same API and embed surfaces for preparation, delivery,
          signing, verification, and completion events.
        </p>
        <TabsList
          variant="line"
          className="mt-10 flex h-auto w-full flex-col items-stretch gap-2 p-0"
        >
          {demos.map((demo) => (
            <TabsTrigger
              key={demo.value}
              value={demo.value}
              className="w-full justify-start rounded-md px-4 text-left text-sm font-semibold after:hidden"
            >
              {demo.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      <div className="min-w-0">
        {demos.map((demo) => (
          <TabsContent key={demo.value} value={demo.value}>
            <div
              className="code-panel code-panel-preview recipe-code h-[390px] overflow-hidden rounded-lg bg-code text-xs shadow-code"
              dangerouslySetInnerHTML={{ __html: demo.highlightedCode }}
            />
            <div className="px-1 pt-5">
              <p className="font-medium text-copy">{demo.description}</p>
              <ul className="mt-2 space-y-1.5">
                {demo.bullets.map((bullet) => (
                  <li
                    key={bullet}
                    className="flex items-center gap-2 text-sm text-copy"
                  >
                    <Check className="size-4 text-ink" />
                    {bullet}
                  </li>
                ))}
              </ul>
            </div>
          </TabsContent>
        ))}
      </div>
    </Tabs>
  );
}
