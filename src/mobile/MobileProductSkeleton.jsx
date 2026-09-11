export default function MobileProductSkeleton() {
  return (
    <div className="mob_card mob_skeleton_card">
      <div className="mob_sk_img" />
      <div className="mob_sk_body">
        <div className="mob_sk_line" style={{ width: '50%' }} />
        <div className="mob_sk_line" />
        <div className="mob_sk_line" style={{ width: '75%' }} />
        <div className="mob_sk_price" />
      </div>
    </div>
  )
}