import React from "react";
import Svg, { Circle, Line, Path } from "react-native-svg";

export function Icon({ name, size = 24, color = "#64748B", strokeWidth = 2 }) {
  const half = size / 2;
  const stroke = color;

  switch (name) {
    case "search":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="11" cy="11" r="6" stroke={stroke} strokeWidth={strokeWidth} />
          <Line x1="16" y1="16" x2="21" y2="21" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
        </Svg>
      );
    case "close":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Line x1="6" y1="6" x2="18" y2="18" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
          <Line x1="18" y1="6" x2="6" y2="18" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
        </Svg>
      );
    case "check":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M5 12l4 4 10-10" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case "play":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M8 6l10 6-10 6V6Z" stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round" />
        </Svg>
      );
    case "lock":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M7 11V8a5 5 0 0 1 10 0v3" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
          <Path d="M6 11h12v8H6z" stroke={stroke} strokeWidth={strokeWidth} />
        </Svg>
      );
    case "people":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="9" cy="9" r="3" stroke={stroke} strokeWidth={strokeWidth} />
          <Circle cx="16" cy="10" r="2.5" stroke={stroke} strokeWidth={strokeWidth} />
          <Path d="M4 19c0-3 3-5 5-5s5 2 5 5" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
          <Path d="M13 19c0-2.3 2.2-3.8 4-3.8 1.8 0 3.5 1 3.8 2.8" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
        </Svg>
      );
    case "bell":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M6 9a6 6 0 0 1 12 0c0 4 2 4.5 2 5.5H4c0-1 2-1.5 2-5.5Z" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
          <Circle cx="12" cy="18" r="1.5" stroke={stroke} strokeWidth={strokeWidth} />
        </Svg>
      );
    case "bell-off":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M6 9a6 6 0 0 1 12 0c0 4 2 4.5 2 5.5H4c0-1 2-1.5 2-5.5Z" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
          <Circle cx="12" cy="18" r="1.5" stroke={stroke} strokeWidth={strokeWidth} />
          <Line x1="4" y1="4" x2="20" y2="20" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
        </Svg>
      );
    case "mail":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M4 6h16v12H4z" stroke={stroke} strokeWidth={strokeWidth} />
          <Path d="M4 7l8 6 8-6" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
        </Svg>
      );
    case "mail-unread":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M4 6h16v12H4z" stroke={stroke} strokeWidth={strokeWidth} />
          <Path d="M4 7l8 6 8-6" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
          <Circle cx="18" cy="6" r="2" stroke={stroke} strokeWidth={strokeWidth} />
        </Svg>
      );
    case "send":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M4 12l16-8-5 16-3-6-8-2Z" stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round" />
        </Svg>
      );
    case "link":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M9 15l-1 1a4 4 0 0 1-6-6l3-3a4 4 0 0 1 6 0" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
          <Path d="M15 9l1-1a4 4 0 0 1 6 6l-3 3a4 4 0 0 1-6 0" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
        </Svg>
      );
    case "globe":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="12" r="9" stroke={stroke} strokeWidth={strokeWidth} />
          <Path d="M3 12h18" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
          <Path d="M12 3c3 3.5 3 14 0 18" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
          <Path d="M12 3c-3 3.5-3 14 0 18" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
        </Svg>
      );
    case "trophy":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M8 5h8v3a4 4 0 0 1-8 0V5Z" stroke={stroke} strokeWidth={strokeWidth} />
          <Path d="M6 5H4a3 3 0 0 0 3 6" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
          <Path d="M18 5h2a3 3 0 0 1-3 6" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
          <Path d="M10 14h4v3h-4z" stroke={stroke} strokeWidth={strokeWidth} />
          <Path d="M8 20h8" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
        </Svg>
      );
    case "clock":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="12" r="9" stroke={stroke} strokeWidth={strokeWidth} />
          <Path d="M12 7v5l3 2" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
        </Svg>
      );
    case "home":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M4 11l8-7 8 7" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M6 10v9h12v-9" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case "joystick":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="8" r="3" stroke={stroke} strokeWidth={strokeWidth} />
          <Path d="M12 11v4" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
          <Path d="M7 20h10" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
          <Path d="M8 16h8" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
          <Path d="M6.5 18c0-2.2 2.7-4 5.5-4s5.5 1.8 5.5 4" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
        </Svg>
      );
    case "user":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="8" r="4" stroke={stroke} strokeWidth={strokeWidth} />
          <Path d="M4 20c0-4 4-6 8-6s8 2 8 6" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
        </Svg>
      );
    case "pause":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M8 5v14" stroke={stroke} strokeWidth={strokeWidth + 0.5} strokeLinecap="round" />
          <Path d="M16 5v14" stroke={stroke} strokeWidth={strokeWidth + 0.5} strokeLinecap="round" />
        </Svg>
      );
    case "info":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="12" r="9" stroke={stroke} strokeWidth={strokeWidth} />
          <Path d="M12 16v-4" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
          <Circle cx="12" cy="8" r="0.5" fill={stroke} stroke={stroke} strokeWidth={strokeWidth * 0.5} />
        </Svg>
      );
    default:
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx={half} cy={half} r={half - 2} stroke={stroke} strokeWidth={strokeWidth} />
        </Svg>
      );
  }
}
