import { Button, Text, View } from "@tarojs/components";
import { useState, type PropsWithChildren } from "react";

export function Disclosure({ title, summary, children, className = "" }: PropsWithChildren<{
  title: string; summary?: string; className?: string;
}>) {
  const [expanded, setExpanded] = useState(false);
  return <View className={`disclosure ${className}`}>
    <Button className="disclosure-toggle" onClick={() => setExpanded((value) => !value)}>
      <View className="disclosure-copy">
        <Text className="card-title">{title}</Text>
        {summary && <Text className="muted disclosure-summary">{summary}</Text>}
      </View>
      <Text className="disclosure-label">{expanded ? "收起说明" : "查看说明"}</Text>
    </Button>
    {expanded && <View className="disclosure-body">{children}</View>}
  </View>;
}
