// OCR 接收压缩后的普通静态图片；只检查载荷，不保存照片或信任客户端 MIME。
const MAX_BYTES=5*1024*1024;
function parseImageBase64(value) {
  const bad=(statusCode,message)=>Object.assign(new Error(message),{statusCode});
  if (typeof value !== 'string' || value.length < 64 || !/^[A-Za-z0-9+/]+={0,2}$/.test(value) || value.length%4) throw bad(400,'图片格式无效，请重新选择；参考照片仍在本机。');
  if (value.length > 4*Math.ceil(MAX_BYTES/3)) throw bad(413,'图片过大，请压缩后重试；参考照片仍在本机。');
  const bytes=Buffer.from(value,'base64');
  if (bytes.length > MAX_BYTES) throw bad(413,'图片过大，请压缩后重试；参考照片仍在本机。');
  if (bytes.toString('base64') !== value) throw bad(400,'图片格式无效，请重新选择；参考照片仍在本机。');
  const png=bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  const jpeg=bytes[0]===255 && bytes[1]===216 && bytes[2]===255;
  const webp=bytes.toString('ascii',0,4)==='RIFF' && bytes.toString('ascii',8,12)==='WEBP';
  if (!png && !jpeg && !webp) throw bad(415,'请选择 PNG、JPEG 或 WebP 图片；参考照片仍在本机。');
  return value;
}
module.exports={MAX_BYTES,parseImageBase64};
