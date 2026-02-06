import { useWindowDimensions } from "react-native";

const BASE_WIDTH = 360;
const BASE_HEIGHT = 780;

export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const scaleW = width / BASE_WIDTH;
  const scaleH = height / BASE_HEIGHT;
  const scaleAll = Math.min(scaleW, scaleH);

  const scale = (size) => size * scaleAll;
  const hScale = (size) => size * scaleW;
  const vScale = (size) => size * scaleH;

  return { width, height, scale, hScale, vScale };
}
