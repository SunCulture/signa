import { tabDemos } from "@/lib/landing-content";

import { highlightCode } from "./code-panel";
import { ApiTabsClient } from "./api-tabs-client";

export async function ApiTabs() {
  const demos = await Promise.all(
    tabDemos.map(async (demo) => ({
      ...demo,
      highlightedCode: await highlightCode(demo.code),
    })),
  );

  return <ApiTabsClient demos={demos} />;
}
