import { Leaf, Zap, Globe, TrendingUp, Users, Shield } from 'lucide-react';
import './AuthSidePanel.css';

export default function AuthSidePanel() {
  const features = [
    {
      icon: <Leaf className="w-4 h-4" />,
      title: "Sustainable Solutions",
      description: "Track and optimize your environmental impact"
    },
    {
      icon: <Zap className="w-4 h-4" />,
      title: "Energy Analytics",
      description: "Monitor energy consumption and efficiency"
    },
    {
      icon: <Globe className="w-4 h-4" />,
      title: "Global Impact",
      description: "Connect with worldwide sustainability initiatives"
    },
    {
      icon: <TrendingUp className="w-4 h-4" />,
      title: "Performance Insights",
      description: "Data-driven insights for better decisions"
    },
    {
      icon: <Users className="w-4 h-4" />,
      title: "Team Collaboration",
      description: "Work together towards sustainability goals"
    },
    {
      icon: <Shield className="w-4 h-4" />,
      title: "Secure & Reliable",
      description: "Enterprise-grade security and reliability"
    }
  ];

  // Generate random particles
  const generateParticles = (count: number, sizeRange: [number, number], opacityRange: [number, number]) => {
    return Array.from({ length: count }, (_, i) => {
      const size = Math.random() * (sizeRange[1] - sizeRange[0]) + sizeRange[0];
      const opacity = Math.random() * (opacityRange[1] - opacityRange[0]) + opacityRange[0];
      const left = Math.random() * 100;
      const top = Math.random() * 100;
      const animationDuration = Math.random() * 12 + 6; // 6-18s (faster movement)
      const animationDelay = Math.random() * 10;
      
      return {
        id: i,
        size,
        opacity,
        left,
        top,
        animationDuration,
        animationDelay
      };
    });
  };

  const smallParticles = generateParticles(40, [1, 4], [0.1, 0.4]);
  const mediumParticles = generateParticles(15, [4, 8], [0.05, 0.3]);
  const tinyParticles = generateParticles(25, [0.5, 2], [0.2, 0.6]);

  return (
    <div className="flex-1 lg:w-1/2 flex items-center justify-center bg-gradient-to-br from-emerald-900 via-teal-800 to-cyan-900 dark:from-emerald-950 dark:via-teal-900 dark:to-cyan-950 relative overflow-hidden">
      {/* Random floating particles system */}
      <div className="absolute inset-0">
        {/* Small white particles */}
        {smallParticles.map((particle) => {
          const animations = ['float1', 'float2', 'float3', 'wave', 'drift', 'zigzag'];
          const randomAnimation = animations[particle.id % animations.length];
          return (
            <div
              key={`small-${particle.id}`}
              className="absolute bg-white rounded-full"
              style={{
                width: `${particle.size}px`,
                height: `${particle.size}px`,
                left: `${particle.left}%`,
                top: `${particle.top}%`,
                opacity: particle.opacity,
                animation: `${randomAnimation} ${particle.animationDuration}s ease-in-out infinite ${particle.animationDelay}s`
              }}
            />
          );
        })}
        
        {/* Medium particles */}
        {mediumParticles.map((particle) => {
          const animations = ['spiral', 'orbit', 'float2'];
          const randomAnimation = animations[particle.id % animations.length];
          return (
            <div
              key={`medium-${particle.id}`}
              className="absolute bg-white rounded-full"
              style={{
                width: `${particle.size}px`,
                height: `${particle.size}px`,
                left: `${particle.left}%`,
                top: `${particle.top}%`,
                opacity: particle.opacity,
                animation: `${randomAnimation} ${particle.animationDuration}s ease-in-out infinite ${particle.animationDelay}s`
              }}
            />
          );
        })}
        
        {/* Tiny particles */}
        {tinyParticles.map((particle) => {
          const animations = ['wave', 'drift', 'float1'];
          const randomAnimation = animations[particle.id % animations.length];
          return (
            <div
              key={`tiny-${particle.id}`}
              className="absolute bg-white rounded-full"
              style={{
                width: `${particle.size}px`,
                height: `${particle.size}px`,
                left: `${particle.left}%`,
                top: `${particle.top}%`,
                opacity: particle.opacity,
                animation: `${randomAnimation} ${particle.animationDuration * 0.8}s ease-in-out infinite ${particle.animationDelay}s`
              }}
            />
          );
        })}
        
        {/* Colored particles */}
        {Array.from({ length: 25 }, (_, i) => {
          const size = Math.random() * 6 + 1;
          const opacity = Math.random() * 0.5 + 0.1;
          const colors = ['bg-cyan-300/40', 'bg-emerald-300/40', 'bg-blue-300/40', 'bg-purple-300/40', 'bg-pink-300/40', 'bg-yellow-300/40', 'bg-teal-300/40', 'bg-indigo-300/40'];
          const color = colors[Math.floor(Math.random() * colors.length)];
          const animationDuration = Math.random() * 10 + 8; // 8-18s (faster)
          const animationDelay = Math.random() * 8;
          const animations = ['float1', 'float2', 'float3', 'spiral', 'wave', 'orbit', 'zigzag', 'drift'];
          const randomAnimation = animations[i % animations.length];
          
          return (
            <div
              key={`colored-${i}`}
              className={`absolute rounded-full ${color}`}
              style={{
                width: `${size}px`,
                height: `${size}px`,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                opacity: opacity,
                animation: `${randomAnimation} ${animationDuration}s ease-in-out infinite ${animationDelay}s`
              }}
            />
          );
        })}
      </div>
      
      {/* Enhanced grid pattern overlay */}
      <div className="absolute inset-0 opacity-15" style={{
        backgroundImage: `
          radial-gradient(circle at 1px 1px, rgba(255,255,255,0.4) 1px, transparent 0),
          linear-gradient(45deg, transparent 49%, rgba(255,255,255,0.1) 50%, transparent 51%),
          linear-gradient(-45deg, transparent 49%, rgba(255,255,255,0.05) 50%, transparent 51%)
        `,
        backgroundSize: '40px 40px, 80px 80px, 120px 120px'
      }}></div>

      <div className="relative flex items-center justify-center z-10 min-h-full py-10 px-6">
        <div className="flex flex-col justify-center max-w-md w-full space-y-8">
          {/* Enhanced description */}
          <div className="text-center space-y-4">
            <h1 className="text-xl font-semibold text-white/95 leading-tight">
              Welcome to Lucent
            </h1>
            <p className="text-xs text-white/75 leading-relaxed max-w-sm mx-auto">
              Your comprehensive sustainability toolkit for a greener future
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-2 gap-3">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20 hover:scale-105 transition-transform duration-300"
                style={{
                  animation: `slideInUp 0.6s ease-out ${index * 0.1}s both`
                }}
              >
                <div className="flex items-center text-white/90 mb-2">
                  {feature.icon}
                </div>
                <h3 className="text-xs font-semibold text-white/95 mb-1">
                  {feature.title}
                </h3>
                <p className="text-xs text-white/70 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>

          {/* Bottom CTA */}
          <div className="text-center">
            <div className="inline-flex items-center space-x-2 text-xs text-white/60">
              <div className="w-2 h-2 bg-white/80 rounded-full animate-pulse"></div>
              <span>Join thousands of organizations making a difference</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
