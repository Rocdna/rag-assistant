/**
 * 粒子背景组件
 *
 * 功能描述：
 * - 星空粒子效果
 * - 响应式画布尺寸
 * - 低性能消耗
 */
'use client';

import { memo, useEffect, useState } from 'react';
import Particles from '@tsparticles/react';
import { initParticlesEngine } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';

// 模块级别标志，防止重复初始化
let engineInitialized = false;
let engineInitPromise: Promise<void> | null = null;

export const ParticleBackground = memo(function ParticleBackground() {
  const [engineReady, setEngineReady] = useState(engineInitialized);

  useEffect(() => {
    if (engineInitialized) return;

    if (!engineInitPromise) {
      engineInitPromise = initParticlesEngine(async (engine) => {
        await loadSlim(engine);
      }).then(() => {
        engineInitialized = true;
        setEngineReady(true);
      });
    } else {
      engineInitPromise.then(() => {
        setEngineReady(true);
      });
    }
  }, []);

  if (!engineReady) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        backgroundColor: 'var(--bg-primary)',
      }} />
    );
  }

  return (
    <Particles
      id="login-particles"
      key="login-particles"
      options={{
        fullScreen: {
          enable: true,
          zIndex: 0,
        },
        background: {
          color: {
            value: 'transparent',
          },
        },
        fpsLimit: 60,
        particles: {
          number: {
            value: 100,
            density: {
              enable: true,
              width: 800,
            },
          },
          color: {
            value: ['#10B981', '#3B82F6', '#8B5CF6', '#06B6D4'],
          },
          shape: {
            type: 'circle',
          },
          opacity: {
            value: { min: 0.4, max: 1 },
            animation: {
              enable: true,
              speed: 0.8,
              sync: false,
            },
          },
          size: {
            value: { min: 1, max: 4 },
          },
          links: {
            enable: true,
            color: 'random',
            distance: 100,
            opacity: 0.3,
            width: 1,
          },
          move: {
            enable: true,
            speed: 2,
            direction: 'none',
            random: true,
            straight: false,
            outModes: {
              default: 'out',
            },
          },
        },
        interactivity: {
          events: {
            onHover: {
              enable: true,
              mode: 'grab',
            },
          },
          modes: {
            grab: {
              distance: 140,
              links: {
                opacity: 0.5,
              },
            },
          },
        },
        detectRetina: true,
      }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
      }}
    />
  );
});
