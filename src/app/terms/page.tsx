export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Điều Khoản Dịch Vụ</h1>
      <p className="text-sm text-gray-500 mb-8">Cập nhật lần cuối: 28/05/2026</p>

      <div className="space-y-6 text-gray-700">
        <section>
          <h2 className="text-xl font-semibold mb-2">1. Giới thiệu</h2>
          <p>StayJoy cung cấp dịch vụ chatbot AI hỗ trợ khách hàng cho các homestay. Khi sử dụng dịch vụ, bạn đồng ý với các điều khoản dưới đây.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">2. Dịch vụ</h2>
          <p>Chatbot StayJoy cung cấp thông tin về homestay (giá phòng, chính sách, tiện ích) và hỗ trợ chuyển yêu cầu đặt phòng đến chủ homestay. Chatbot không thực hiện giao dịch tài chính.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">3. Trách nhiệm</h2>
          <p>Thông tin do chatbot cung cấp mang tính tham khảo. Việc xác nhận đặt phòng và giá cuối cùng do chủ homestay quyết định.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">4. Quyền riêng tư</h2>
          <p>Việc thu thập và sử dụng dữ liệu tuân theo Chính sách quyền riêng tư của chúng tôi.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">5. Liên hệ</h2>
          <p>Email: support@stayjoy.io.vn</p>
        </section>
      </div>
    </div>
  )
}
