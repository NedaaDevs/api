import type {
	QuranAudio,
	QuranAudioReciter,
	QuranRecitation,
} from "@/modules/quran/quran.schemas";
import publishData from "./quran.publish.json";

// Measured per-recitation totals the mirror writes into quran.publish.json.
type RecitationPublish = { bytesApprox?: number; ayahCount?: number };
const publish = publishData as {
	audio?: { recitations?: Record<string, RecitationPublish> };
};

// Static reciter/recitation identity; measured bytesApprox/ayahCount merge below.
type RecitationIdentity = Omit<QuranRecitation, "bytesApprox">;
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
				};
			}),
		}),
	),
};
