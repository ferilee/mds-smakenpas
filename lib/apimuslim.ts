import apiMuslimSpec from "@/apimuslim.json";

type ApiMuslimEnvelope<T> = {
  status: boolean;
  message: string;
  data: T;
};

type ApiMuslimCity = {
  id: string;
  lokasi: string;
};

type ApiMuslimJadwalEntry = {
  tanggal: string;
  imsak: string;
  subuh: string;
  terbit: string;
  dhuha: string;
  dzuhur: string;
  ashar: string;
  maghrib: string;
  isya: string;
};

type ApiMuslimJadwalData = {
  id: string;
  kabko: string;
  prov: string;
  jadwal: Record<string, ApiMuslimJadwalEntry>;
};

export type SholatCity = {
  id: string;
  name: string;
};

export type SholatSchedule = {
  cityId: string;
  cityName: string;
  province: string;
  dateKey: string;
  times: ApiMuslimJadwalEntry;
};

const fallbackBaseUrl = "https://api.myquran.com/v3";
const specServerUrl =
  apiMuslimSpec.servers?.find((server) => server.url)?.url || fallbackBaseUrl;

const APIMUSLIM_BASE_URL = specServerUrl.replace(/\/+$/, "");

function toApiUrl(pathname: string, query?: Record<string, string | undefined>) {
  const url = new URL(pathname.replace(/^\/+/, ""), `${APIMUSLIM_BASE_URL}/`);
  for (const [key, value] of Object.entries(query || {})) {
    if (value) {
      url.searchParams.set(key, value);
    }
  }
  return url;
}

async function apiMuslimGet<T>(pathname: string, query?: Record<string, string | undefined>) {
  const url = toApiUrl(pathname, query);
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  const payload = (await response.json()) as Partial<ApiMuslimEnvelope<T>> & {
    message?: string;
  };

  if (!response.ok || payload.status !== true || payload.data === undefined) {
    throw new Error(payload.message || "API Muslim request failed");
  }

  return payload.data as T;
}

export async function searchSholatCities(keyword: string) {
  const data = await apiMuslimGet<ApiMuslimCity[]>(
    `/sholat/kabkota/cari/${encodeURIComponent(keyword)}`,
  );

  return data.map((item) => ({
    id: item.id,
    name: item.lokasi,
  })) as SholatCity[];
}

function pickJadwalEntry(jadwal: Record<string, ApiMuslimJadwalEntry>) {
  const entries = Object.entries(jadwal || {});
  if (!entries.length) {
    throw new Error("Jadwal tidak ditemukan");
  }
  const [dateKey, times] = entries[0];
  return { dateKey, times };
}

export async function getTodaySholatSchedule(params: {
  cityId: string;
  tz?: string;
}) {
  const data = await apiMuslimGet<ApiMuslimJadwalData>(
    `/sholat/jadwal/${params.cityId}/today`,
    {
      tz: params.tz,
    },
  );

  const { dateKey, times } = pickJadwalEntry(data.jadwal);

  return {
    cityId: data.id,
    cityName: data.kabko,
    province: data.prov,
    dateKey,
    times,
  } as SholatSchedule;
}

export async function getSholatScheduleByDate(params: {
  cityId: string;
  date: string;
}) {
  const data = await apiMuslimGet<ApiMuslimJadwalData>(
    `/sholat/jadwal/${params.cityId}/${params.date}`,
  );

  const { dateKey, times } = pickJadwalEntry(data.jadwal);

  return {
    cityId: data.id,
    cityName: data.kabko,
    province: data.prov,
    dateKey,
    times,
  } as SholatSchedule;
}
