export type Frame = {
  id: number;
  name: string;
  imageUrl: string;
};

export const FRAMES: Frame[] = [
  { id: 1, name: "成長率は100%", imageUrl: "/frames/image1.png" },
  { id: 2, name: "まだ学生の顔してない？", imageUrl: "/frames/image2.png" },
  { id: 3, name: "AI上等（旗）", imageUrl: "/frames/image3.png" },
  { id: 4, name: "AI上等ロゴ", imageUrl: "/frames/image4.png" },
  { id: 5, name: "顧客が幸せになるまで", imageUrl: "/frames/image5.png" },
  { id: 6, name: "冷笑はやべぇだろ", imageUrl: "/frames/image6.png" },
  { id: 99, name: "AI上等（縦）", imageUrl: "/frames/image_99.png" },
];
