export interface Chair {
  id?: number;
  x: number;
  y: number;
  relativeX: number;
  relativeY: number;
  rotation: number;
  isReserved?: boolean;
}

export interface Door {
  id?: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  type: 'simple' | 'double';
}

export interface Table {
  id?: number;
  roomId?: number;
  name: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number | null;
  shape: string | null;
  extraAttributes: {
    lThicknessX: number;
    lThicknessY: number;
    uThickness?: number;
    uBaseThickness: number;
  };
  chairs: Chair[];
}
