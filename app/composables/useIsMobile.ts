export const useIsMobile = () => {
  const isMobile = ref(false);

  const checkMobile = () => {
    if (typeof window === 'undefined') return;

    const ua = navigator.userAgent || navigator.vendor || (window as any).opera;
    const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua.toLowerCase());
    // Réduire le seuil à 768px pour les tablettes/mobiles en mode portrait
    // et ne considérer comme mobile que si le UA correspond OU si l'écran est vraiment petit
    const isSmallScreen = window.innerWidth <= 768;

    isMobile.value = isMobileUA || isSmallScreen;
  };

  onMounted(() => {
    checkMobile();
    window.addEventListener('resize', checkMobile);
  });

  onUnmounted(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', checkMobile);
    }
  });

  return isMobile;
};
