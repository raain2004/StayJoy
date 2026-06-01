export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Chính Sách Quyền Riêng Tư</h1>
      <p className="text-sm text-gray-500 mb-8">Cập nhật lần cuối: 28/05/2026</p>

      <div className="space-y-6 text-gray-700">
        <section>
          <h2 className="text-xl font-semibold mb-2">1. Thông tin chúng tôi thu thập</h2>
          <p>Khi bạn sử dụng dịch vụ chatbot của StayJoy, chúng tôi có thể thu thập:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Tên và thông tin liên hệ (số điện thoại, email) khi bạn yêu cầu đặt phòng</li>
            <li>Nội dung tin nhắn bạn gửi qua chatbot</li>
            <li>Thông tin từ tài khoản mạng xã hội (tên hiển thị) khi bạn nhắn tin qua Facebook/Telegram</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">2. Mục đích sử dụng</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Trả lời câu hỏi của bạn về homestay (giá, chính sách, tiện ích)</li>
            <li>Chuyển yêu cầu đặt phòng đến chủ homestay</li>
            <li>Xử lý yêu cầu dịch vụ khi bạn đang lưu trú</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">3. Chia sẻ dữ liệu</h2>
          <p>Chúng tôi chỉ chia sẻ thông tin của bạn với chủ homestay mà bạn liên hệ. Chúng tôi không bán hoặc chia sẻ dữ liệu với bên thứ ba khác.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">4. Bảo mật</h2>
          <p>Dữ liệu được lưu trữ an toàn trên hệ thống có mã hóa. Chỉ chủ homestay liên quan mới có quyền truy cập thông tin của bạn.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">5. Quyền của bạn</h2>
          <p>Bạn có quyền yêu cầu xóa dữ liệu cá nhân bất kỳ lúc nào bằng cách liên hệ chúng tôi.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">6. Liên hệ</h2>
          <p>Email: support@stayjoy.io.vn</p>
        </section>
      </div>
    </div>
  )
}
