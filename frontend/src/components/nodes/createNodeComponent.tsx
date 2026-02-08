import { memo } from 'react';
import type { NodeProps } from 'reactflow';
import { BaseNode } from './BaseNode';
import type { GraphNode } from '../../types/graph';

export function createNodeComponent(displayName: string) {
  const Component = memo(({ data, selected }: NodeProps<GraphNode>) => (
    <BaseNode node={data} selected={selected} />
  ));
  Component.displayName = displayName;
  return Component;
}
