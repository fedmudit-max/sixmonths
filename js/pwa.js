let deferredInstallPrompt = null;

export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js")
      .catch((err) => console.error("Service worker registration failed:", err));
  });
}

export function setupInstallPrompt() {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    showInstallBanner("android");
  });
}

export async function promptInstall() {
  if (!deferredInstallPrompt) return false;

  deferredInstallPrompt.prompt();
  const { outcome } = await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  dismissIB();

  return outcome === "accepted";
}

export function showInstallBanner(platform) {
  if (localStorage.getItem("ib_off")) return;

  const banner = document.getElementById("ib");
  const text = banner.querySelector(".ib-txt span");
  const installBtn = document.getElementById("ib-install");

  if (platform === "ios") {
    text.textContent = 'Tap Share → "Add to Home Screen" for the full app.';
    installBtn.style.display = "none";
  } else if (deferredInstallPrompt) {
    text.textContent = "Install for offline access and a home-screen icon.";
    installBtn.style.display = "block";
  } else {
    return;
  }

  banner.classList.add("show");
}

export function dismissIB() {
  document.getElementById("ib").classList.remove("show");
  localStorage.setItem("ib_off", "1");
}

export function checkInstallBanner() {
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone;

  if (isStandalone) return;

  if (isIOS) {
    showInstallBanner("ios");
  }
}
