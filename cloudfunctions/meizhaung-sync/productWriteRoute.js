const { reviewAndIssueProductReceipt } = require('./productReceipt');
const { ProductReviewError } = require('./productReview');
const RULE = 'beauty-owned-write-v1';
const messages = {
  CONTENT_REJECTED:'内容未通过校验，请修改；本机原稿保留。',
  PLATFORM_SESSION_REQUIRED:'请重新微信登录；本机原稿保留。',
  PLATFORM_SESSION_REJECTED:'微信云会话已失效，请重新登录；本机原稿保留。',
  WECHAT_SESSION_REQUIRED:'微信处理凭证已失效，请重试；本机原稿保留。',
  IDENTITY_MISMATCH:'两个微信会话不属于同一账号；本机原稿保留。'
};
function createProductReceiptHandler({ configuration, fetchImpl=fetch, clock=Date.now }) {
  return async (request,response) => {
    try {
      const body=request.body;
      if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).sort().join(',')!=='expectedVersions,rows') {
        return response.status(400).json({code:'PRODUCT_PAYLOAD_INVALID',error:'提交格式有误，本机原稿保留。'});
      }
      const c=configuration();
      if(!c.wxSecret)return response.status(503).json({ok:false,pending:true,code:'REVIEW_CONFIG_MISSING',error:'云端内容校验尚未配置，本机原稿保留。'});
      const receipt=await reviewAndIssueProductReceipt({rows:body.rows,expectedVersions:body.expectedVersions,
        platformToken:request.get('x-wb-platform-session')||'',processingToken:(request.get('authorization')||'').replace(/^Bearer\s+/i,''),
        publishableKey:c.publishableKey,secret:c.wxSecret,receiptSecret:c.receiptSecret,fetchImpl,now:clock(),clock});
      return response.json({ok:true,ruleVersion:RULE,receipt});
    } catch(error) {
      const known=error instanceof ProductReviewError;
      // 排障日志（2026-10-13 会话失效诊断）：只记错误码/消息，不含任何用户数据。
      console.log('[ProductReview] reject', known?error.code:((error && error.message) || 'unknown'));
      return response.status(known?error.status:503).json({ok:false,pending:true,code:known?error.code:'PRODUCT_REVIEW_UNAVAILABLE',
        error:messages[error.code]||'云端内容校验尚未完成，本机原稿保留，请稍后重试。'});
    }
  };
}
module.exports={RULE,createProductReceiptHandler};
