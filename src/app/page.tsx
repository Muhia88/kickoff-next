import Hero from "@/components/Hero";
import SearchBar from "@/components/SearchBar";
import ProductCategories from "@/components/ProductCategories";
import FeaturedItems from "@/components/FeaturedItems";
import ProductOfTheWeek from "@/components/ProductOfTheWeek";
import PromoBanners from "@/components/PromoBanners";
import WhatsAppContact from "@/components/WhatsAppContact";

export default function Home() {
  return (
    <>
      <Hero />
      <div className="-mt-8 relative z-20 mb-8">
        <SearchBar />
      </div>
      <ProductCategories />
      <FeaturedItems />
      <ProductOfTheWeek />
      <PromoBanners />
      <WhatsAppContact />
    </>
  );
}
