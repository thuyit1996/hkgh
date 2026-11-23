import type { ImageSourcePropType } from 'react-native';

export type Comic = {
 title: string;
 author: string;
 cover: ImageSourcePropType;
 status: 'Đang ra' | 'Hoàn thành';
 updatedAt: string;
 genres: string[];
 description: string;
};

export type Chapter = {
 id: string;
 index: number;
 title: string;
};

export const cover = require('../../assets/comic/hero.png');
export const onboardingImage = require('../../assets/comic/onboarding-bg.png');

/** App chỉ phục vụ duy nhất truyện này */
export const comic: Comic = {
 title: 'Hiệp Khách Giang Hồ',
 author: 'Jeon Geuk-jin & Yang Jae-hyun',
 cover,
 status: 'Đang ra',
 updatedAt: 'Cập nhật 2 giờ trước',
 genres: ['Võ hiệp', 'Hành động', 'Hài hước', 'Phiêu lưu'],
 description:
 'Hàn Bá Thiên – chàng thiếu niên ngông nghênh, truyền nhân duy nhất của Thiên Ma Thần Quân – rời núi bước vào chốn giang hồ. Trên đường phiêu bạt, cậu gặp nữ hiệp Đàm Hoa Lân và từ đó bị cuốn vào vòng ân oán giữa Chính phái và Tà phái, nơi những trận huyết chiến và âm mưu tranh đoạt đang khiến cả võ lâm dậy sóng.',
};

const chapterTitles = [
 'Thiếu Niên Xuống Núi',
 'Gặp Gỡ Nữ Hiệp',
 'Tửu Quán Đại Loạn',
 'Truyền Nhân Thiên Ma',
 'Chính Tà Bất Lưỡng Lập',
 'Hắc Phong Trại',
 'Kiếm Pháp Thất Truyền',
 'Đêm Trăng Huyết Chiến',
 'Võ Lâm Minh Chủ',
 'Ân Oán Giang Hồ',
 'Bí Kíp Thất Lạc',
 'Hiệp Khách Hành',
];

export const chapters: Chapter[] = chapterTitles.map((title, i) => ({
 id: `ch-${i + 1}`,
 index: i + 1,
 title,
}));
