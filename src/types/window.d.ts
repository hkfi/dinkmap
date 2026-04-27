import type { Map } from "maplibre-gl";

declare global {
  interface Window {
    __pickleballMap?: Map;
  }
}

export {};
