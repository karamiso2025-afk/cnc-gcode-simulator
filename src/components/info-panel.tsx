'use client';
import React from 'react';
import type { InfoPanelProps, PathSegment } from '../shared-types';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Separator } from './ui/separator';

type Props = Partial<InfoPanelProps> & {
  segments?: Partial<PathSegment>[];
};

export default function InfoPanel({
  stats = null,
  machineState,
  currentSegmentIndex = 0,
  segments = [],
  fileName = null,
}: Props): JSX.Element {
  const currentLineNumber = segments[currentSegmentIndex]?.lineNumber ?? '-';

  const formatTime = (minutes: number): string => {
    const m = Math.floor(minutes);
    const s = Math.round((minutes - m) * 60);
    return `${m}分${s}秒`;
  };

  return (
    <div data-testid="info-panel">
        <Card className="rounded-none border-0">
          <CardContent className="space-y-4">
            <section aria-labelledby="file-info-heading">
              <h4 id="file-info-heading" className="text-sm font-semibold mb-1">ファイル情報</h4>
              <p className="text-sm text-muted-foreground">
                {fileName ? fileName : 'ファイル未読込'}
              </p>
              {stats && (
                <p className="text-sm text-muted-foreground">総行数: {stats.totalLines}</p>
              )}
            </section>

            <Separator />

            <section aria-labelledby="position-heading">
              <h4 id="position-heading" className="text-sm font-semibold mb-2">現在位置</h4>
              {machineState ? (
                <dl className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">X</dt>
                    <dd>{machineState.position.x.toFixed(3)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Y</dt>
                    <dd>{machineState.position.y.toFixed(3)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Z</dt>
                    <dd>{machineState.position.z.toFixed(3)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">現在行</dt>
                    <dd>{currentLineNumber}</dd>
                  </div>
                </dl>
              ) : (
                <p className="text-sm text-muted-foreground">位置情報なし</p>
              )}
            </section>

            <Separator />

            <section aria-labelledby="machine-state-heading">
              <h4 id="machine-state-heading" className="text-sm font-semibold mb-2">マシン状態</h4>
              {machineState ? (
                <dl className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">送り速度</dt>
                    <dd>{machineState.feedRate} mm/min</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">スピンドル</dt>
                    <dd>{machineState.spindleState} {machineState.spindleSpeed} RPM</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">工具</dt>
                    <dd>T{machineState.currentTool.number}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">モード</dt>
                    <dd>{machineState.distanceMode} / {machineState.unitMode}</dd>
                  </div>
                </dl>
              ) : (
                <p className="text-sm text-muted-foreground">マシン状態なし</p>
              )}
            </section>

            {stats && (
              <>
                <Separator />
                <section aria-labelledby="stats-heading">
                  <h4 id="stats-heading" className="text-sm font-semibold mb-2">統計サマリー</h4>
                  <dl className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">早送り</dt>
                      <dd>{stats.rapidMoves}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">直線</dt>
                      <dd>{stats.linearMoves}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">円弧</dt>
                      <dd>{stats.arcMoves}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">推定加工時間</dt>
                      <dd>{formatTime(stats.estimatedTimeMinutes)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">総距離</dt>
                      <dd>{stats.totalDistance.toFixed(1)} mm</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">切削距離</dt>
                      <dd>{stats.cuttingDistance.toFixed(1)} mm</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">加工範囲 X</dt>
                      <dd>{stats.boundingBox.min.x.toFixed(1)}〜{stats.boundingBox.max.x.toFixed(1)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">加工範囲 Y</dt>
                      <dd>{stats.boundingBox.min.y.toFixed(1)}〜{stats.boundingBox.max.y.toFixed(1)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">加工範囲 Z</dt>
                      <dd>{stats.boundingBox.min.z.toFixed(1)}〜{stats.boundingBox.max.z.toFixed(1)}</dd>
                    </div>
                  </dl>
                </section>
              </>
            )}
          </CardContent>
        </Card>
    </div>
  );
}
