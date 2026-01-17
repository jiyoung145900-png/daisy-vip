// CloudinaryService.js
const CLOUD_NAME = "dwla93cgd"; 
const UPLOAD_PRESET = "daisy_upload"; 

export const uploadToCloudinary = async (file) => {
  if (!file) return null;

  const resourceType = file.type.startsWith('video') ? 'video' : 'image';

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);

  // ★ [수정] Unsigned 업로드에서는 transformation 파라미터를 명시하면 에러가 발생합니다.
  // 코드에서는 삭제하고, 설정은 Cloudinary 대시보드에서 처리해야 합니다.

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    const data = await response.json();
    
    if (data.secure_url) {
      console.log("업로드 성공 URL:", data.secure_url);
      return data.secure_url; 
    } else {
      console.error("업로드 실패:", data.error?.message);
      return null;
    }
  } catch (error) {
    console.error("Cloudinary 서버 통신 에러:", error);
    return null;
  }
};