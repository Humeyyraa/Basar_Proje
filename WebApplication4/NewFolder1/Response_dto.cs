namespace WebApplication4.DTOs
{
    public class ResponseDto<T>
    {
        public string Mesaj { get; set; }
        public T Data { get; set; }
    }
}
