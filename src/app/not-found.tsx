export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">ページが見つかりません</h2>
        <p className="text-muted-foreground">お探しのページは存在しないか、移動した可能性があります。</p>
      </div>
    </div>
  );
}
