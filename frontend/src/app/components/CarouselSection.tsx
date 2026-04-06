import React from 'react';
import Slider from 'react-slick';
import { SERVICE_CATALOG, buildServicePath } from '../data/services';
import { ArrowRight, Scale, FileCheck, FileEdit, Target, Eye, MapPin, Monitor } from 'lucide-react';
import { useNavigate } from 'react-router';

// Import slick-carousel css
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';

export const CarouselSection = () => {
  const navigate = useNavigate();

  const displayItems = SERVICE_CATALOG;

  // Icon mapping for each service
  const getServiceIcon = (index: number) => {
    const icons = [Scale, FileCheck, FileEdit, Target, Eye, MapPin, Monitor];
    const IconComponent = icons[index] || Target;
    return <IconComponent size={28} />;
  };

  const settings = {
    dots: false,
    infinite: true,
    speed: 800,
    slidesToShow: 4,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 3000,
    cssEase: 'ease-in-out',
    pauseOnHover: true,
    pauseOnFocus: true,
    swipe: true,
    swipeToSlide: true,
    touchMove: true,
    draggable: true,
    arrows: false,
    responsive: [
      {
        breakpoint: 1280,
        settings: {
          slidesToShow: 3,
        },
      },
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 2,
        },
      },
      {
        breakpoint: 640,
        settings: {
          slidesToShow: 1,
        },
      },
    ],
  };

  return (
    <section className="py-32 bg-gray-50 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 mb-20 flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-blue-600 mb-4 block">
            OUR CAPABILITIES
          </span>
          <h2 className="text-5xl md:text-7xl" style={{ fontFamily: "'Playfair Display', serif" }}>
            Tailored Legal
            <br />
            Solutions
          </h2>
        </div>
        <p className="text-xl text-gray-500 max-w-sm font-light leading-relaxed">
          From high-stakes litigation to complex corporate advisory, our multi-disciplinary approach
          ensures strategic excellence.
        </p>
      </div>

      <div className="carousel-container -mx-4">
        <Slider {...settings}>
          {displayItems.map((item, i) => (
            <div key={i} className="px-4">
              <div
                onClick={() => navigate(buildServicePath(item.title))}
                className="bg-white p-12 h-[450px] rounded-[3rem] border border-gray-100 hover:shadow-2xl hover:shadow-black/5 transition-all group cursor-pointer flex flex-col"
              >
                <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-black group-hover:text-white transition-all mb-10 flex-shrink-0">
                  {getServiceIcon(i)}
                </div>
                <h3
                  className="text-3xl font-bold mb-6 group-hover:text-blue-600 transition-colors line-clamp-2"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  {item.title}
                </h3>
                <p className="text-gray-500 text-base leading-relaxed mb-10 line-clamp-4 font-light">
                  {item.summary ||
                    'Excellence in specialized legal support and strategic advisory for global financial hubs.'}
                </p>
                <div className="mt-auto flex items-center gap-3 text-sm font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all -translate-x-4 group-hover:translate-x-0">
                  LEARN MORE
                  <ArrowRight size={16} />
                </div>
              </div>
            </div>
          ))}
        </Slider>
      </div>

      <style>{`
        .carousel-container .slick-list {
          overflow: visible;
        }
        .carousel-container .slick-track {
          display: flex !important;
        }
        .carousel-container .slick-slide {
          height: inherit !important;
        }
      `}</style>
    </section>
  );
};
