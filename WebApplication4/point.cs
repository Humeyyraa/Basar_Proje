using NetTopologySuite.Geometries;

namespace WebApplication4
{
    public class Point
    {
        public int Id { get; set; }         
        public string Name { get; set; }    

        public Geometry? Location { get; set; }  
    }
}
