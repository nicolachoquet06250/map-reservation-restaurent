import type { Ref } from 'vue';
import type { RoomZone } from '~/types/room';

export const usePlateform = (roomZonesData: Ref<RoomZone[]>) => {
  const platformZones = computed(() => roomZonesData.value.filter(zone => zone.type === 'estrade'));

  const getPlatformDefaultName = () => 'Nouvelle estrade';

  return {
    platformZones,
    getPlatformDefaultName
  };
};
