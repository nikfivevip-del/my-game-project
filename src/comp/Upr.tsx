import React, { useRef, useEffect, useCallback } from "react";
import Webcam from "react-webcam";
import { Holistic, Results, HAND_CONNECTIONS } from "@mediapipe/holistic";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import { Camera } from "@mediapipe/camera_utils";

type CircleState = {
  x: number;
  y: number;
  radius: number;
  color: "gray" | "red" | "blue";
};

const App: React.FC = () => {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const circlesRef = useRef<CircleState[]>([
    { x: 100, y: 450, radius: 50, color: "gray" },
    { x: 300, y: 500, radius: 50, color: "gray" },
    { x: 500, y: 500, radius: 50, color: "gray" },
    { x: 700, y: 450, radius: 50, color: "gray" },
  ]);

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

  const detectCollision = (handLandmarks: any, circle: CircleState) => {
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

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(
      results.image,
      0,
      0,
      canvasElement.width,
      canvasElement.height,
    );

    drawConnectors(canvasCtx, results.leftHandLandmarks, HAND_CONNECTIONS, {
      color: "grey",
    });
    drawLandmarks(canvasCtx, results.leftHandLandmarks, {
      color: "rgb(70, 70, 255)",
      fillColor: "rgb(0,0,255)",
    });

    drawConnectors(canvasCtx, results.rightHandLandmarks, HAND_CONNECTIONS, {
      color: "grey",
    });
    drawLandmarks(canvasCtx, results.rightHandLandmarks, {
      color: "rgb(255, 70, 70)",
      fillColor: "rgb(255, 0, 0)",
    });

    circlesRef.current.forEach((circle, index) => {
      canvasCtx.beginPath();
      canvasCtx.arc(circle.x, circle.y, circle.radius, 0, 2 * Math.PI);
      canvasCtx.fillStyle = circle.color;
      canvasCtx.fill();
      canvasCtx.closePath();

      const leftHandCollision = detectCollision(
        results.leftHandLandmarks,
        circle,
      );
      const rightHandCollision = detectCollision(
        results.rightHandLandmarks,
        circle,
      );

      if (leftHandCollision) {
        circlesRef.current[index].color = "blue";
      } else if (rightHandCollision) {
        circlesRef.current[index].color = "red";
      } else {
        circlesRef.current[index].color = "gray";
      }
    });

    canvasCtx.restore();
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
      }}
    >
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
          transform: "scaleX(-1)",
        }}
        mirrored={true}
      />
      <canvas
        ref={canvasRef}
        width="800px"
        height="600px"
        style={{
          position: "absolute",
          marginLeft: "auto",
          marginRight: "auto",
          left: 0,
          right: 0,
          textAlign: "center",
          width: 800,
          height: 600,
          transform: "scaleX(-1)",
          zIndex: 1,
        }}
      />
    </div>
  );
};

export default App;
