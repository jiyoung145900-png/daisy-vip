export async function uploadToCloudinary(file) {
  const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  if (!file) throw new Error("업로드 파일이 없습니다.");
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error("Cloudinary env 누락");
  }

  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);

  let res;
  try {
    res = await fetch(url, { method: "POST", body: formData });
  } catch (e) {
    throw new Error("Failed to fetch (네트워크 차단/확장프로그램 가능)");
  }

  // 🔥 여기
  const rawText = await res.text();
  console.log("Cloudinary RAW RESPONSE:", res.status, rawText);

  let data = {};
  try {
    data = JSON.parse(rawText);
  } catch (_) {}

  if (!res.ok) {
    throw new Error(data?.error?.message || `업로드 실패 (${res.status})`);
  }

  if (!data?.secure_url) {
    throw new Error("secure_url 없음");
  }

  return data.secure_url;
}
