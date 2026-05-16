import { Card, CardContent } from "@/components/ui/card";

export default function ProtectedPage() {
  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full">
      <h1 className="text-lg font-semibold text-foreground">보호종목</h1>
      <Card className="bg-card border-border">
        <CardContent className="flex flex-col items-center justify-center py-16 gap-2">
          <p className="text-sm font-medium text-foreground">보호종목 관리</p>
          <p className="text-xs text-muted-foreground">Phase 2에서 제공 예정</p>
        </CardContent>
      </Card>
    </div>
  );
}
