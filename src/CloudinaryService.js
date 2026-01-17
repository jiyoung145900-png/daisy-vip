const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

export const uploadToCloudinary = async (file) => {
  if (!file) return null;

  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    console.error("Cloudinary env 누락: VITE_CLOUDINARY_CLOUD_NAME / VITE_CLOUDINARY_UPLOAD_PRESET 확인");
    return null;
  }

  const resourceType = file.type?.startsWith("video") ? "video" : "image";

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`,
      { method: "POST", body: formData }
    );

    const data = await response.json();

    if (data?.secure_url) {
      console.log("업로드 성공 URL:", data.secure_url);
      return data.secure_url;
    }

    console.error("업로드 실패:", data?.error?.message || data);
    return null;
  } catch (error) {
    console.error("Cloudinary 서버 통신 에러:", error);
    return null;
  }
};
