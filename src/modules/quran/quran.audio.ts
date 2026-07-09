import type {
	QuranAudio,
	QuranAudioReciter,
	QuranRecitation,
} from "@/modules/quran/quran.schemas";
import publishData from "./quran.publish.json";

// Measured per-recitation totals the mirror writes into quran.publish.json.
type RecitationPublish = {
	bytesApprox?: number;
	ayahCount?: number;
	surahBytes?: number[];
	timings?: { url: string; version: string; bytes: number };
};
const publish = publishData as {
	audio?: { recitations?: Record<string, RecitationPublish> };
};

const ZERO_SURAH_BYTES: number[] = Array(114).fill(0);

// Static reciter/recitation identity; measured bytesApprox/ayahCount merge below.
type RecitationIdentity = Omit<QuranRecitation, "bytesApprox" | "surahBytes">;
type ReciterIdentity = Omit<QuranAudioReciter, "recitations"> & {
	recitations: RecitationIdentity[];
};

const AUDIO_VERSION = "1.0.0";
const DEFAULT_RECITATION_ID = "minshawi-murattal";

const AUDIO_IDENTITY: ReciterIdentity[] = [
	{
		id: "minshawi",
		nameArabic: "محمد صديق المنشاوي",
		nameEnglish: "Muhammad Siddiq al-Minshawi",
		recitations: [
			{
				id: "minshawi-murattal",
				style: "Murattal",
				riwayah: "hafs",
				granularity: "ayah",
				basePath: "audio/minshawi-murattal/",
				fileFormat: "mp3",
				ayahCount: 6236,
				published: true,
			},
			{
				id: "muhammad-siddiq-al-minshawy-murattal",
				style: "Murattal",
				riwayah: "hafs",
				granularity: "surah",
				basePath: "audio/muhammad-siddiq-al-minshawy-murattal/",
				fileFormat: "mp3",
				ayahCount: 6236,
				published: false,
			},
		],
	},
	{
		id: "mahmoud-husary",
		nameArabic: "محمود خليل الحصري",
		nameEnglish: "Mahmoud Khalil Al-Husary",
		recitations: [
			{
				id: "mahmoud-husary-mujawwad",
				style: "Mujawwad",
				riwayah: "hafs",
				granularity: "surah",
				basePath: "audio/mahmoud-husary-mujawwad/",
				fileFormat: "mp3",
				ayahCount: 6236,
				published: false,
			},
			{
				id: "mahmoud-husary-murattal",
				style: "Murattal",
				riwayah: "hafs",
				granularity: "ayah",
				basePath: "audio/mahmoud-husary-murattal/",
				fileFormat: "mp3",
				ayahCount: 6236,
				published: false,
			},
		],
	},
	{
		id: "abdullah-ali-jabir",
		nameArabic: "عبدالله علي جابر",
		nameEnglish: "Abdullah Ali Jabir",
		recitations: [
			{
				id: "abdullah-ali-jabir",
				style: "Murattal",
				riwayah: "hafs",
				granularity: "surah",
				basePath: "audio/abdullah-ali-jabir/",
				fileFormat: "mp3",
				ayahCount: 6236,
				published: false,
			},
		],
	},
	{
		id: "abdullah-khayat",
		nameArabic: "عبدالله خياط",
		nameEnglish: "Abdullah Khayat",
		recitations: [
			{
				id: "abdullah-khayat",
				style: "Murattal",
				riwayah: "hafs",
				granularity: "surah",
				basePath: "audio/abdullah-khayat/",
				fileFormat: "mp3",
				ayahCount: 6236,
				published: false,
			},
		],
	},
	{
		id: "abdul-basit-abdul-samad",
		nameArabic: "عبد الباسط عبد الصمد",
		nameEnglish: "Abdul Basit Abd as-Samad",
		recitations: [
			{
				id: "abdul-basit-abdul-samad-murattal",
				style: "Murattal",
				riwayah: "hafs",
				granularity: "ayah",
				basePath: "audio/abdul-basit-abdul-samad-murattal/",
				fileFormat: "mp3",
				ayahCount: 6236,
				published: false,
			},
			{
				id: "abdul-basit-abdul-samad-mujawwad-hafs-949",
				style: "Mujawwad",
				riwayah: "hafs",
				granularity: "ayah",
				basePath: "audio/abdul-basit-abdul-samad-mujawwad-hafs-949/",
				fileFormat: "mp3",
				ayahCount: 6236,
				published: false,
			},
		],
	},
	{
		id: "abdur-rahman-as-sudais",
		nameArabic: "عبدالرحمن السديس",
		nameEnglish: "Abdur-Rahman As-Sudais",
		recitations: [
			{
				id: "abdul-rahman-al-sudais-murattal-hafs-951",
				style: "Murattal",
				riwayah: "hafs",
				granularity: "ayah",
				basePath: "audio/abdul-rahman-al-sudais-murattal-hafs-951/",
				fileFormat: "mp3",
				ayahCount: 6236,
				published: false,
			},
			{
				id: "abdur-rahman-as-sudais-recitation",
				style: "Murattal",
				riwayah: "hafs",
				granularity: "ayah",
				basePath: "audio/abdur-rahman-as-sudais-recitation/",
				fileFormat: "mp3",
				ayahCount: 6236,
				published: false,
			},
		],
	},
	{
		id: "abu-bakr-al-shatri",
		nameArabic: "أبو بكر الشاطري",
		nameEnglish: "Abu Bakr Al-Shatri",
		recitations: [
			{
				id: "abu-bakr-al-shatri-murattal-hafs-952",
				style: "Murattal",
				riwayah: "hafs",
				granularity: "ayah",
				basePath: "audio/abu-bakr-al-shatri-murattal-hafs-952/",
				fileFormat: "mp3",
				ayahCount: 6236,
				published: false,
			},
		],
	},
	{
		id: "ahmad-alnufais",
		nameArabic: "أحمد النفيس",
		nameEnglish: "Ahmad Alnufais",
		recitations: [
			{
				id: "alnufais",
				style: "Murattal",
				riwayah: "hafs",
				granularity: "ayah",
				basePath: "audio/alnufais/",
				fileFormat: "mp3",
				ayahCount: 6236,
				published: false,
			},
		],
	},
	{
		id: "khalifa-al-tunaiji",
		nameArabic: "خليفة الطنيجي",
		nameEnglish: "Khalifa Al Tunaiji",
		recitations: [
			{
				id: "khalifa-al-tunaiji-murattal",
				style: "Murattal",
				riwayah: "hafs",
				granularity: "ayah",
				basePath: "audio/khalifa-al-tunaiji-murattal/",
				fileFormat: "mp3",
				ayahCount: 6236,
				published: false,
			},
		],
	},
	{
		id: "saad-al-ghamdi",
		nameArabic: "سعد الغامدي",
		nameEnglish: "Saad Al-Ghamdi",
		recitations: [
			{
				id: "saad-al-ghamdi-murattal",
				style: "Murattal",
				riwayah: "hafs",
				granularity: "ayah",
				basePath: "audio/saad-al-ghamdi-murattal/",
				fileFormat: "mp3",
				ayahCount: 6236,
				published: false,
			},
		],
	},
	{
		id: "khalid-al-jalil",
		nameArabic: "خالد الجليل",
		nameEnglish: "Khalid Al-Jalil",
		recitations: [
			{
				id: "khalid-al-jalil",
				style: "Murattal",
				riwayah: "hafs",
				granularity: "surah",
				basePath: "audio/khalid-al-jalil/",
				fileFormat: "mp3",
				ayahCount: 6236,
				published: false,
			},
		],
	},
	{
		id: "ali-abdur-rahman-al-huthaify",
		nameArabic: "علي عبدالرحمن الحذيفي",
		nameEnglish: "Ali Abdur-Rahman al-Huthaify",
		recitations: [
			{
				id: "ali-abdur-rahman-al-huthaify",
				style: "Murattal",
				riwayah: "hafs",
				granularity: "surah",
				basePath: "audio/ali-abdur-rahman-al-huthaify/",
				fileFormat: "mp3",
				ayahCount: 6236,
				published: false,
			},
		],
	},
	{
		id: "muhammad-jibreel",
		nameArabic: "محمد جبريل",
		nameEnglish: "Muhammad Jibreel",
		recitations: [
			{
				id: "muhammad-jibreel",
				style: "Murattal",
				riwayah: "hafs",
				granularity: "surah",
				basePath: "audio/muhammad-jibreel/",
				fileFormat: "mp3",
				ayahCount: 6236,
				published: false,
			},
		],
	},
];

export const audio: QuranAudio = {
	version: AUDIO_VERSION,
	defaultRecitationId: DEFAULT_RECITATION_ID,
	reciters: AUDIO_IDENTITY.map(
		(reciter): QuranAudioReciter => ({
			...reciter,
			recitations: reciter.recitations.map((rec): QuranRecitation => {
				const measured = publish.audio?.recitations?.[rec.id];
				return {
					...rec,
					ayahCount: measured?.ayahCount ?? rec.ayahCount,
					bytesApprox: measured?.bytesApprox ?? 0,
					surahBytes: measured?.surahBytes ?? ZERO_SURAH_BYTES,
					...(measured?.timings ? { timings: measured.timings } : {}),
				};
			}),
		}),
	),
};
