import { createClient } from "@/lib/supabase/client";

export async function compressAndUploadImage(
  file: File,
  onProgress?: (pct: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = async () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        const maxDimension = 1920;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          async (blob) => {
            if (!blob) {
              reject(new Error("Image compression failed"));
              return;
            }

            if (onProgress) onProgress(30);

            const supabase = createClient();
            const fileName = `ticket_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
            const { data, error } = await supabase.storage
              .from("ticket-attachments")
              .upload(fileName, blob, {
                contentType: "image/jpeg",
              });

            if (onProgress) onProgress(80);

            if (error) {
              // Fallback to Base64 data URL if Supabase bucket doesn't exist
              console.warn("Supabase storage error, falling back to inline data URL:", error);
              resolve(canvas.toDataURL("image/jpeg", 0.8));
            } else {
              const { data: publicUrlData } = supabase.storage
                .from("ticket-attachments")
                .getPublicUrl(data.path);
              if (onProgress) onProgress(100);
              resolve(publicUrlData.publicUrl);
            }
          },
          "image/jpeg",
          0.85
        );
      };
    };
    reader.onerror = (err) => reject(err);
  });
}
