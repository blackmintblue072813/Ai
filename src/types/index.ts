export interface Folder {
  id: string;
  name: string;
}

export type HighlightColor = 'yellow' | 'green' | 'rose' | 'blue';

export type FontSizeOption = 'xs' | 'sm' | 'base' | 'lg';

// 사용자가 지정한 4가지 색상 기반 테마:
// asphalt: #302f2c 중심의 웜 차콜 다크 모드
// grayblue: #2b323f 중심의 그레이 블루 딥 다크 모드
// paper: #efede3 중심의 클래식 페이퍼 라이트 모드
// milk: #ec5e27 대신 이미지 속 오타를 감안하여 밀크/크림 화이트(#FCFBF7/Milk)와 포인트 색상 조화 모드
export type ThemeMode = 'asphalt' | 'grayblue' | 'paper' | 'milk';

export interface TextHighlight {
  id: string;
  text: string;
  color: HighlightColor;
  createdAt: string;
}

export interface LogEntry {
  id: string;
  folderId: string;
  title: string;
  content: string;
  isFavorite?: boolean;
  fontSize?: FontSizeOption;
  highlights?: TextHighlight[];
  createdAt: string;
  updatedAt: string;
}
