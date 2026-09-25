// Murojaatlar (qo'llab-quvvatlash) registri.
// Admin xabarga reply bersa — reply_to_message.message_id bo'yicha,
// /javob <ID> bilan esa token bo'yicha foydalanuvchiga javob boradi.

const byMsgId = new Map()
const byToken = new Map()

export function setAppeal(msgId, data) {
  byMsgId.set(String(msgId), data)
  if (data.token) byToken.set(String(data.token), data)
}

export function getAppealByMsgId(msgId) {
  return byMsgId.get(String(msgId))
}

export function getAppealByToken(token) {
  return byToken.get(String(token))
}

export function deleteAppeal(msgId) {
  const data = byMsgId.get(String(msgId))
  if (data?.token) byToken.delete(String(data.token))
  byMsgId.delete(String(msgId))
}