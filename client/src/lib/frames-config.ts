export type Frame = {
  id: number;
  name: string;
  imageUrl: string;
};

export const FRAMES: Frame[] = [
  { id: 1, name: "シンプル白枠", imageUrl: "/frames/frame1.svg" },
  { id: 2, name: "カラフル", imageUrl: "/frames/frame2.svg" },
  { id: 3, name: "きらきら", imageUrl: "/frames/frame3.svg" },
];
