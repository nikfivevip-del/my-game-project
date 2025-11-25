import React, { useRef, useState, useEffect, useCallback } from "react";
import Webcam from "react-webcam";
import { Holistic, Results, HAND_CONNECTIONS } from "@mediapipe/holistic";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import { Camera } from "@mediapipe/camera_utils";

type Landmark = {
  x: number;
  y: number;
  z: number;
  visibility?: number;
};

type Circle = {
  x: number;
  y: number;
  radius: number;
  color: "gray" | "red" | "purple" | "yellow" | "orange";
  activeTime: number | null;
  timeoutId: NodeJS.Timeout | null;
};

const App: React.FC = () => {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [gameActive, setGameActive] = useState<boolean>(true);
  
  const circlesRef = useRef<Circle[]>([
    {
      x: 100,
      y: 150,
      radius: 40,
      color: "gray",
      activeTime: null,
      timeoutId: null,
    },
    {
      x: 250,
      y: 120,
      radius: 40,
      color: "gray",
      activeTime: null,
      timeoutId: null,
    },
    {
      x: 400,
      y: 150,
      radius: 40,
      color: "gray",
      activeTime: null,
      timeoutId: null,
    },
    {
      x: 550,
      y: 120,
      radius: 40,
      color: "gray",
      activeTime: null,
      timeoutId: null,
    },
    {
      x: 700,
      y: 150,
      radius: 40,
      color: "gray",
      activeTime: null,
      timeoutId: null,
    },
  ]);

  // Таймер игры
  useEffect(() => {
    if (!gameActive) return;

    const timer = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          clearInterval(timer);
          setGameActive(false);
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameActive]);

  const runHolistic = useCallback(async () => {
    if (
      typeof webcamRef.current !== "undefined" &&
      webcamRef.current !== null &&
      webcamRef.current.video !== null
    ) {
      const holistic = new Holistic({
        locateFile: (file) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`,
      });

      holistic.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      holistic.onResults((results) => {
        drawCanvas(results);
      });

      const camera = new Camera(webcamRef.current.video, {
        onFrame: async () => {
          await holistic.send({ image: webcamRef.current!.video! });
        },
        width: 800,
        height: 600,
      });
      camera.start();
    }
  }, []);

  useEffect(() => {
    runHolistic();
  }, [runHolistic]);

  const activateCircle = (index: number) => {
    if (!gameActive) return;
    
    const randomColor = Math.random() > 0.5 ? "red" : "purple";
    circlesRef.current[index] = {
      ...circlesRef.current[index],
      color: randomColor,
      activeTime: Date.now(),
    };
  };

  const resetCircle = (index: number) => {
    circlesRef.current[index] = {
      ...circlesRef.current[index],
      color: "gray",
      activeTime: null,
    };
  };

  const startCircleCycle = (index: number) => {
    const timeoutId = setTimeout(() => {
      if (!gameActive) return;
      activateCircle(index);
      const resetTimeoutId = setTimeout(() => {
        if (!gameActive) return;
        resetCircle(index);
        const newTimeoutId = setTimeout(() => {
          startCircleCycle(index);
        }, Math.random() * 2000 + 1000);

        circlesRef.current[index] = {
          ...circlesRef.current[index],
          timeoutId: newTimeoutId,
        };
      }, 1200);
      circlesRef.current[index] = {
        ...circlesRef.current[index],
        timeoutId: resetTimeoutId,
      };
    }, Math.random() * 3000 + 1000);

    circlesRef.current[index] = {
      ...circlesRef.current[index],
      timeoutId: timeoutId,
    };
  };

  useEffect(() => {
    if (!gameActive) {
      circlesRef.current.forEach((circle) => {
        if (circle.timeoutId) {
          clearTimeout(circle.timeoutId);
        }
      });
      return;
    }

    circlesRef.current.forEach((_, index) => {
      startCircleCycle(index);
    });

    return () => {
      circlesRef.current.forEach((circle) => {
        if (circle.timeoutId) {
          clearTimeout(circle.timeoutId);
        }
      });
    };
  }, [gameActive]);

  const detectCollision = (handLandmarks: Landmark[] | undefined, circle: Circle) => {
    if (!handLandmarks) return false;

    for (let i = 0; i < handLandmarks.length; i++) {
      const landmark = handLandmarks[i];
      const distance = Math.sqrt(
        Math.pow(landmark.x * 800 - circle.x, 2) +
          Math.pow(landmark.y * 600 - circle.y, 2),
      );
      if (distance < circle.radius) {
        return true;
      }
    }
    return false;
  };

  const drawCanvas = (results: Results) => {
    const canvasElement = canvasRef.current;
    if (!canvasElement) return;

    const canvasCtx = canvasElement.getContext("2d");
    if (!canvasCtx) return;

    const gradient = canvasCtx.createLinearGradient(0, 0, 800, 600);
    gradient.addColorStop(0, "#1a1a2e");
    gradient.addColorStop(0.5, "#16213e");
    gradient.addColorStop(1, "#0f3460");
    
    canvasCtx.save();
    canvasCtx.fillStyle = gradient;
    canvasCtx.fillRect(0, 0, canvasElement.width, canvasElement.height);
    
    canvasCtx.drawImage(
      results.image,
      0,
      0,
      canvasElement.width,
      canvasElement.height,
    );

    if (results.leftHandLandmarks) {
      drawConnectors(canvasCtx, results.leftHandLandmarks, HAND_CONNECTIONS, {
        color: '#8B5FBF',
        lineWidth: 3,
      });
      drawLandmarks(canvasCtx, results.leftHandLandmarks, {
        color: '#6A0DAD',
        fillColor: '#8A2BE2',
        lineWidth: 2,
        radius: 4,
      });
    }

    if (results.rightHandLandmarks) {
      drawConnectors(canvasCtx, results.rightHandLandmarks, HAND_CONNECTIONS, {
        color: '#FF6B6B',
        lineWidth: 3,
      });
      drawLandmarks(canvasCtx, results.rightHandLandmarks, {
        color: '#DC143C',
        fillColor: '#FF4500',
        lineWidth: 2,
        radius: 4,
      });
    }

    circlesRef.current.forEach((circle, index) => {
      if (circle.color !== "gray") {
        canvasCtx.shadowColor = circle.color === "red" ? '#FF0000' : 
                               circle.color === "purple" ? '#8A2BE2' : 
                               circle.color;
        canvasCtx.shadowBlur = 15;
      }

      canvasCtx.beginPath();
      canvasCtx.arc(circle.x, circle.y, circle.radius, 0, 2 * Math.PI);
      canvasCtx.fillStyle = circle.color;
      canvasCtx.fill();
      canvasCtx.closePath();
      
      canvasCtx.shadowBlur = 0;

      if (gameActive) {
        if (circle.color !== "gray") {
          const leftHandCollision = detectCollision(
            results.leftHandLandmarks,
            circle,
          );
          const rightHandCollision = detectCollision(
            results.rightHandLandmarks,
            circle,
          );

          if (
            (circle.color === "purple" && leftHandCollision) ||
            (circle.color === "red" && rightHandCollision)
          ) {
            circlesRef.current[index].color = "yellow";
            setScore((prevScore) => prevScore + 100);

            setTimeout(() => {
              circlesRef.current[index] = {
                ...circlesRef.current[index],
                color: "gray",
                activeTime: null,
              };
            }, 500);
          } else if (
            (circle.color === "red" && leftHandCollision) ||
            (circle.color === "purple" && rightHandCollision)
          ) {
            circlesRef.current[index].color = "orange";
            setScore((prevScore) => prevScore - 50);

            setTimeout(() => {
              circlesRef.current[index] = {
                ...circlesRef.current[index],
                color: "gray",
                activeTime: null,
              };
            }, 500);
          }
        }
      }
    });

    canvasCtx.restore();
  };

  const resetGame = () => {
    setScore(0);
    setTimeLeft(30);
    setGameActive(true);
    circlesRef.current = [
      {
        x: 100,
        y: 150,
        radius: 40,
        color: "gray",
        activeTime: null,
        timeoutId: null,
      },
      {
        x: 250,
        y: 120,
        radius: 40,
        color: "gray",
        activeTime: null,
        timeoutId: null,
      },
      {
        x: 400,
        y: 150,
        radius: 40,
        color: "gray",
        activeTime: null,
        timeoutId: null,
      },
      {
        x: 550,
        y: 120,
        radius: 40,
        color: "gray",
        activeTime: null,
        timeoutId: null,
      },
      {
        x: 700,
        y: 150,
        radius: 40,
        color: "gray",
        activeTime: null,
        timeoutId: null,
      },
    ];
  };

  const startGame = () => {
    resetGame();
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: "100vw",
        height: "100vh",
        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
        fontFamily: "'Arial', sans-serif",
        overflow: "hidden",
      }}
    >
      {/* Заголовок игры */}
      <div
        style={{
          position: "absolute",
          top: "10px",
          left: "50%",
          transform: "translateX(-50%)",
          fontSize: "32px",
          fontWeight: "bold",
          color: "#FFD700",
          textAlign: "center",
          textShadow: "0 0 10px rgba(255, 215, 0, 0.5)",
          zIndex: 10,
        }}
      >
        🎯 НАБЕРИ КАК МОЖНО БОЛЬШЕ ОЧКОВ! 🎯
      </div>

      {/* Таймер */}
      <div
        style={{
          position: "absolute",
          top: "60px",
          left: "50%",
          transform: "translateX(-50%)",
          fontSize: "28px",
          fontWeight: "bold",
          color: timeLeft <= 10 ? "#FF6B6B" : "#00FF7F",
          backgroundColor: "rgba(0, 0, 0, 0.7)",
          padding: "10px 20px",
          borderRadius: "15px",
          zIndex: 10,
          backdropFilter: "blur(10px)",
          border: timeLeft <= 10 ? "2px solid #FF6B6B" : "2px solid #00FF7F",
          animation: timeLeft <= 10 ? "pulse 0.5s infinite" : "none",
        }}
      >
        ⏰ Время: {timeLeft}с
      </div>

      {/* Статистика игры */}
      <div
        style={{
          position: "absolute",
          top: "120px",
          left: "20px",
          fontSize: "20px",
          color: "white",
          backgroundColor: "rgba(0, 0, 0, 0.7)",
          padding: "15px",
          borderRadius: "15px",
          zIndex: 10,
          backdropFilter: "blur(10px)",
        }}
      >
        <div>🎯 Очки: {score}</div>
      </div>

      {/* Легенда управления */}
      <div
        style={{
          position: "absolute",
          top: "120px",
          right: "20px",
          fontSize: "14px",
          color: "white",
          backgroundColor: "rgba(0, 0, 0, 0.7)",
          padding: "15px",
          borderRadius: "15px",
          zIndex: 10,
          backdropFilter: "blur(10px)",
        }}
      >
        <div style={{ marginBottom: "8px", color: "#8A2BE2" }}>🟣 Фиолетовый - Левая рука</div>
        <div style={{ marginBottom: "8px", color: "#DC143C" }}>🔴 Красный - Правая рука</div>
        <div style={{ color: "#FFD700" }}>🟡 Желтый - Правильно!</div>
        <div style={{ color: "#FFA500" }}>🟠 Оранжевый - Неправильно!</div>
      </div>

      {/* Стартовый экран */}
      {!gameActive && timeLeft === 30 && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            fontSize: "36px",
            color: "white",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            padding: "40px",
            borderRadius: "25px",
            textAlign: "center",
            zIndex: 100,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "25px",
            backdropFilter: "blur(15px)",
            border: "3px solid #8A2BE2",
            boxShadow: "0 0 30px rgba(138, 43, 226, 0.5)",
          }}
        >
          <div>🎮 Готовы начать? 🎮</div>
          <div style={{ fontSize: "20px" }}>У вас 30 секунд!</div>
          <button
            onClick={startGame}
            style={{
              fontSize: "20px",
              padding: "12px 30px",
              background: "linear-gradient(45deg, #8A2BE2, #DC143C)",
              color: "white",
              border: "none",
              borderRadius: "12px",
              cursor: "pointer",
              fontWeight: "bold",
              transition: "all 0.3s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.05)";
              e.currentTarget.style.boxShadow = "0 5px 15px rgba(138, 43, 226, 0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            🚀 Начать игру!
          </button>
        </div>
      )}

      {/* Экран окончания игры */}
      {!gameActive && timeLeft === 0 && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            fontSize: "42px",
            color: "white",
            background: "linear-gradient(135deg, #00b09b 0%, #96c93d 100%)",
            padding: "40px",
            borderRadius: "25px",
            textAlign: "center",
            zIndex: 100,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "25px",
            backdropFilter: "blur(15px)",
            border: "3px solid #FFD700",
            boxShadow: "0 0 30px rgba(255, 215, 0, 0.5)",
          }}
        >
          <div>⏰ Время вышло! ⏰</div>
          <div style={{ fontSize: "24px" }}>Финальный счет: {score}</div>
          <button
            onClick={resetGame}
            style={{
              fontSize: "20px",
              padding: "12px 30px",
              background: "linear-gradient(45deg, #FFD700, #FFA500)",
              color: "black",
              border: "none",
              borderRadius: "12px",
              cursor: "pointer",
              fontWeight: "bold",
              transition: "all 0.3s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.05)";
              e.currentTarget.style.boxShadow = "0 5px 15px rgba(255, 215, 0, 0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            🔄 Играть снова
          </button>
        </div>
      )}

      {/* Веб-камера и канвас */}
      <Webcam
        ref={webcamRef}
        style={{
          position: "absolute",
          marginLeft: "auto",
          marginRight: "auto",
          left: 0,
          right: 0,
          textAlign: "center",
          width: 800,
          height: 600,
          borderRadius: "20px",
          border: "3px solid #444",
          boxShadow: "0 0 20px rgba(0, 0, 0, 0.5)",
          opacity: gameActive ? 1 : 0.7,
        }}
        mirrored={true}
      />

      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        style={{
          position: "absolute",
          marginLeft: "auto",
          marginRight: "auto",
          left: 0,
          right: 0,
          width: 800,
          height: 600,
          transform: "scaleX(-1)",
          zIndex: 1,
          borderRadius: "20px",
          border: "3px solid #444",
          opacity: gameActive ? 1 : 0.7,
        }}
      />

      {/* CSS анимация для пульсации таймера */}
      <style>
        {`
          @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
          }
        `}
      </style>
    </div>
  );
};

export default App;