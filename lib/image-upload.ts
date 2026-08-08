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
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError || !user) {
              reject(new Error("Please sign in before uploading an attachment."));
              return;
            }
            const fileName = `${user.id}/${crypto.randomUUID()}.jpg`;
            const { data, error } = await supabase.storage
              .from("ticket-attachments")
              .upload(fileName, blob, {
                contentType: "image/jpeg",
              });

            if (onProgress) onProgress(80);

            if (error) {
              reject(new Error(`Attachment upload failed: ${error.message}`));
            } else {
              if (onProgress) onProgress(100);
              resolve(`/api/attachments/${data.path.split("/").map(encodeURIComponent).join("/")}`);
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
