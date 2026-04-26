import React from 'react';
import Svg, { Circle, Ellipse, Line, Path, Rect } from 'react-native-svg';

interface Props {
  level: 1 | 2 | 3 | 4 | 5;
  size?: number;
}

// ─── カラーパレット ────────────────────────────────────────────────────────────
const GREEN = '#4CAF50';
const DARK_GREEN = '#2E7D4F';
const CORAL = '#E0522A';
const STEM = '#5D9E43';
const SOIL = '#A07840';
const SOIL_DARK = '#7A5A2C';
const YELLOW = '#FFD700';
const YELLOW_DARK = '#E6A800';

// ─── 共通パーツ ───────────────────────────────────────────────────────────────

function Ground() {
  return (
    <>
      <Ellipse cx={50} cy={88} rx={30} ry={7} fill={SOIL_DARK} opacity={0.5} />
      <Ellipse cx={50} cy={86} rx={28} ry={5} fill={SOIL} opacity={0.7} />
    </>
  );
}

// ─── Lv1: 小さな芽 ────────────────────────────────────────────────────────────
function PlantLv1() {
  return (
    <>
      <Ground />
      {/* 茎 */}
      <Line
        x1={50} y1={83} x2={50} y2={60}
        stroke={STEM} strokeWidth={3} strokeLinecap="round"
      />
      {/* 一枚葉 */}
      <Ellipse
        cx={50} cy={55} rx={9} ry={13}
        fill={GREEN}
        transform="rotate(-5, 50, 55)"
      />
      {/* 葉脈 */}
      <Line
        x1={50} y1={45} x2={50} y2={66}
        stroke={DARK_GREEN} strokeWidth={1} strokeLinecap="round"
        opacity={0.5}
      />
    </>
  );
}

// ─── Lv2: 葉が2枚 ────────────────────────────────────────────────────────────
function PlantLv2() {
  return (
    <>
      <Ground />
      {/* 茎 */}
      <Line
        x1={50} y1={83} x2={50} y2={44}
        stroke={STEM} strokeWidth={3} strokeLinecap="round"
      />
      {/* 下の葉（左） */}
      <Ellipse
        cx={39} cy={68} rx={13} ry={7}
        fill={GREEN}
        transform="rotate(-35, 39, 68)"
      />
      {/* 下の葉（右） */}
      <Ellipse
        cx={61} cy={68} rx={13} ry={7}
        fill={GREEN}
        transform="rotate(35, 61, 68)"
      />
      {/* 上の葉（左） */}
      <Ellipse
        cx={41} cy={53} rx={11} ry={6}
        fill={DARK_GREEN}
        transform="rotate(-30, 41, 53)"
      />
      {/* 上の葉（右） */}
      <Ellipse
        cx={59} cy={53} rx={11} ry={6}
        fill={DARK_GREEN}
        transform="rotate(30, 59, 53)"
      />
      {/* 先端の小さな葉 */}
      <Ellipse
        cx={50} cy={40} rx={7} ry={10}
        fill={GREEN}
        opacity={0.9}
      />
    </>
  );
}

// ─── Lv3: つぼみ（コーラル色）────────────────────────────────────────────────
function PlantLv3() {
  return (
    <>
      <Ground />
      {/* 茎 */}
      <Line
        x1={50} y1={83} x2={50} y2={44}
        stroke={STEM} strokeWidth={3} strokeLinecap="round"
      />
      {/* 葉（左） */}
      <Ellipse
        cx={37} cy={66} rx={14} ry={7}
        fill={GREEN}
        transform="rotate(-38, 37, 66)"
      />
      {/* 葉（右） */}
      <Ellipse
        cx={63} cy={66} rx={14} ry={7}
        fill={GREEN}
        transform="rotate(38, 63, 66)"
      />
      {/* 上の小葉 */}
      <Ellipse
        cx={42} cy={52} rx={10} ry={6}
        fill={DARK_GREEN}
        transform="rotate(-25, 42, 52)"
      />
      <Ellipse
        cx={58} cy={52} rx={10} ry={6}
        fill={DARK_GREEN}
        transform="rotate(25, 58, 52)"
      />
      {/* つぼみ（涙形） */}
      <Path
        d="M50 20 C 60 26, 62 36, 50 44 C 38 36, 40 26, 50 20 Z"
        fill={CORAL}
      />
      {/* つぼみのハイライト */}
      <Path
        d="M50 23 Q 55 30, 55 38"
        stroke="rgba(255,255,255,0.45)"
        strokeWidth={1.5}
        strokeLinecap="round"
        fill="none"
      />
    </>
  );
}

// ─── Lv4: 開花（コーラル色の花・黄色い中心）─────────────────────────────────
function PlantLv4() {
  const petals = [0, 72, 144, 216, 288];
  const FLOWER_CX = 50;
  const FLOWER_CY = 38;

  return (
    <>
      <Ground />
      {/* 茎 */}
      <Line
        x1={50} y1={83} x2={50} y2={52}
        stroke={STEM} strokeWidth={3} strokeLinecap="round"
      />
      {/* 葉 */}
      <Ellipse
        cx={37} cy={67} rx={14} ry={7}
        fill={GREEN}
        transform="rotate(-38, 37, 67)"
      />
      <Ellipse
        cx={63} cy={67} rx={14} ry={7}
        fill={GREEN}
        transform="rotate(38, 63, 67)"
      />
      {/* 花びら（5枚） */}
      {petals.map((deg) => (
        <Ellipse
          key={deg}
          cx={FLOWER_CX}
          cy={FLOWER_CY - 14}
          rx={6}
          ry={12}
          fill={CORAL}
          opacity={0.9}
          transform={`rotate(${deg}, ${FLOWER_CX}, ${FLOWER_CY})`}
        />
      ))}
      {/* 花の中心（黄色） */}
      <Circle cx={FLOWER_CX} cy={FLOWER_CY} r={9} fill={YELLOW} />
      <Circle cx={FLOWER_CX} cy={FLOWER_CY} r={5} fill={YELLOW_DARK} />
      <Circle cx={FLOWER_CX - 2} cy={FLOWER_CY - 2} r={2} fill="rgba(255,255,255,0.5)" />
    </>
  );
}

// ─── Lv5: 結実（コーラル色の実）─────────────────────────────────────────────
function PlantLv5() {
  return (
    <>
      <Ground />
      {/* メイン茎 */}
      <Line
        x1={50} y1={83} x2={50} y2={36}
        stroke={STEM} strokeWidth={3} strokeLinecap="round"
      />
      {/* 枝（左） */}
      <Line
        x1={50} y1={60} x2={33} y2={48}
        stroke={STEM} strokeWidth={2.5} strokeLinecap="round"
      />
      {/* 枝（右） */}
      <Line
        x1={50} y1={54} x2={67} y2={42}
        stroke={STEM} strokeWidth={2.5} strokeLinecap="round"
      />
      {/* 大きな葉 */}
      <Ellipse
        cx={36} cy={68} rx={14} ry={7}
        fill={GREEN}
        transform="rotate(-40, 36, 68)"
      />
      <Ellipse
        cx={64} cy={68} rx={14} ry={7}
        fill={GREEN}
        transform="rotate(40, 64, 68)"
      />
      {/* 小さな葉（枝先） */}
      <Ellipse
        cx={29} cy={44} rx={9} ry={5}
        fill={DARK_GREEN}
        transform="rotate(-20, 29, 44)"
      />
      <Ellipse
        cx={71} cy={38} rx={9} ry={5}
        fill={DARK_GREEN}
        transform="rotate(20, 71, 38)"
      />
      {/* 実（3個）*/}
      <Circle cx={50} cy={27} r={11} fill={CORAL} />
      <Circle cx={33} cy={40} r={9} fill={CORAL} opacity={0.88} />
      <Circle cx={67} cy={33} r={9} fill={CORAL} opacity={0.88} />
      {/* 実のハイライト */}
      <Circle cx={46} cy={24} r={3.5} fill="rgba(255,255,255,0.42)" />
      <Circle cx={30} cy={37} r={3} fill="rgba(255,255,255,0.38)" />
      <Circle cx={64} cy={30} r={3} fill="rgba(255,255,255,0.38)" />
    </>
  );
}

// ─── メインコンポーネント ─────────────────────────────────────────────────────

export function PlantIllustration({ level, size = 120 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {level === 1 && <PlantLv1 />}
      {level === 2 && <PlantLv2 />}
      {level === 3 && <PlantLv3 />}
      {level === 4 && <PlantLv4 />}
      {level === 5 && <PlantLv5 />}
    </Svg>
  );
}
