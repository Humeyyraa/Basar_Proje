/* Id değerini otomatik arttırdığımız için
swaggerdan ıd kutucuğunu kaldırmak amacıyla oluşturduk. yalnızca girdi istediğimiz türleri yazdık. (x,y,name)
using System.ComponentModel.DataAnnotations;  doğrulama attributelarını kullanabilmemizi sağlar.
attribute lar uygulanacağı verinin üzerine yazılırlar.

 */
using System.ComponentModel.DataAnnotations;

namespace WebApplication4
{
    public class Id_free_dto
    {
        [Required(ErrorMessage = "Koordinat alanını doldurmak zorunludur!")]
        [Range(25.6, 45.0, ErrorMessage = "Boylam değeri (PointX) Türkiye sınırlarında bulunmalı.")]
        public double PointX { get; set; }

        [Required(ErrorMessage = "Koordinat alanını doldurmak zorunludur!")]
        [Range(35.8, 42.1, ErrorMessage = "Enlem değeri (PointY) Türkiye sınırlarında bulunmalı.")]
        public double PointY { get; set; }

        [Required(ErrorMessage = "Name alanını doldurmak zorunludur!")]
        [MaxLength(20, ErrorMessage = "Name için en fazla 20 karakter girilebilir.")]
        public string Name { get; set; }
    }
}
