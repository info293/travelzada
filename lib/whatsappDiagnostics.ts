/**
 * Plain-language explanations for WhatsApp Cloud API errors, shown to staff when a send fails.
 */

/** Plain-language fix for the Meta errors seen when sending */
export function whatsappErrorHint(code?: number, subcode?: number): string | undefined {
  switch (code) {
    case 190:
      return subcode === 463
        ? 'The access token has EXPIRED. Put the permanent System User token in WHATSAPP_ACCESS_TOKEN (Vercel → Settings → Environment Variables) and redeploy.'
        : 'The access token is INVALID or was revoked. Check WHATSAPP_ACCESS_TOKEN on this deployment (Vercel → Settings → Environment Variables), compare tokenFingerprint with your local .env, then redeploy.'
    case 10:
    case 200:
      return 'The token has no permission for this WhatsApp account. Use the System User token (travelzada_api) with whatsapp_business_messaging, assigned to the WhatsApp account.'
    case 100:
      return 'Invalid parameter, usually a wrong WHATSAPP_PHONE_NUMBER_ID on this deployment. It should be 1342447552283055 (+91 85298 70220).'
    case 131047:
      return 'Outside the 24-hour window: the customer has not messaged you in the last 24 hours. Send an approved template first.'
    case 131030:
      return 'The recipient is not on the allowed list of the test number.'
    case 131026:
      return 'The recipient cannot receive WhatsApp messages (not on WhatsApp, old app version, or blocked you).'
    case 131042:
      return 'Payment problem on the WhatsApp account. Add a payment method in Meta Billing.'
    case 132001:
      return 'Template not found in this WhatsApp account or language.'
    case 133010:
      return 'The phone number is not registered on the Cloud API.'
    case 2:
    case 1:
    case 4:
      return 'Temporary problem on Meta’s side. Try again in a minute.'
    default:
      return undefined
  }
}
