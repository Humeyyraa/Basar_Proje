using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WebApplication4.Migrations
{
    /// <inheritdoc />
    public partial class AddWKTColumn : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PointX",
                table: "Points");

            migrationBuilder.DropColumn(
                name: "PointY",
                table: "Points");

            migrationBuilder.AddColumn<string>(
                name: "WKT",
                table: "Points",
                type: "text",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "WKT",
                table: "Points");

            migrationBuilder.AddColumn<double>(
                name: "PointX",
                table: "Points",
                type: "double precision",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "PointY",
                table: "Points",
                type: "double precision",
                nullable: false,
                defaultValue: 0.0);
        }
    }
}
