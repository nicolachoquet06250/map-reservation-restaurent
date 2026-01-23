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

export type ZoneType = 'zone' | 'estrade' | 'terrasse';

export interface RoomZone {
  id?: number;
  name?: string;
  type: ZoneType;
  units: Set<string>;
}

export interface RoomLayer {
  id: number;
  name: string;
  type: string;
}

export interface Point {
  x: number;
  y: number;
}

export interface Room {
  id: number;
  name: string;
  points: string;
  slug: string;
}

export interface Zone {
  id: number;
  name: string;
  type: ZoneType;
  units: Set<string>;
}