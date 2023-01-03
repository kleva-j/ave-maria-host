import React from 'react';

import { TooltipProvider } from '@radix-ui/react-tooltip';

type TooltipProviderProps = React.ComponentProps<typeof TooltipProvider>;
interface DesignSystemProviderProps extends TooltipProviderProps {
  position?: 'top' | 'bottom';
}

export const DesignSystemProvider: React.FC<DesignSystemProviderProps> = (
  props,
) => <TooltipProvider {...props} />;
