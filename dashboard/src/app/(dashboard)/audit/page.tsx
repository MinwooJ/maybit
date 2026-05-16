import { Card, CardContent } from "@/components/ui/card";

export default function AuditPage() {
  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full">
      <h1 className="text-lg font-semibold text-foreground">감사로그</h1>
      <Card className="bg-card border-border">
        <CardContent className="flex flex-col items-center justify-center py-16 gap-2">
          <p className="text-sm font-medium text-foreground">감사 로그</p>
          <p className="text-xs text-muted-foreground">Phase 3에서 제공 예정</p>
        </CardContent>
      </Card>
    </div>
  );
}
