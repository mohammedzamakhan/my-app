import React, { useState, useEffect, useRef } from 'react';

function CanvasElementDetector() {
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const [hoveredElement, setHoveredElement] = useState(null);
  const [selectedElements, setSelectedElements] = useState([]);

  useEffect(() => {
    const resizeCanvas = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
        canvas.style.width = `${window.innerWidth}px`;
        canvas.style.height = `${window.innerHeight}px`;
        
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
      }
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        
        // Clear the canvas
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        // Draw guide lines and measurements for selected elements
        if (selectedElements.length > 0) {
          drawGuideLines(ctx, selectedElements);
          drawMeasurements(ctx, selectedElements);
        }

        // Draw Figma-style boxes for selected elements
        drawFigmaStyleBoxes(ctx, selectedElements);

        // Draw box model for hovered element
        if (hoveredElement) {
          drawBoxModel(ctx, hoveredElement.element);
        }
      }
    }
  }, [selectedElements, hoveredElement]);

  const drawGuideLines = (ctx, elements) => {
    ctx.strokeStyle = 'rgba(255, 0, 0, 1)';  // Less transparent red
    ctx.setLineDash([2, 2]);  // Dashed line
    ctx.lineWidth = 1;

    elements.forEach(element => {
      const rect = element.getBoundingClientRect();

      // Horizontal lines
      ctx.beginPath();
      ctx.moveTo(0, rect.top);
      ctx.lineTo(ctx.canvas.width, rect.top);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, rect.bottom);
      ctx.lineTo(ctx.canvas.width, rect.bottom);
      ctx.stroke();

      // Vertical lines
      ctx.beginPath();
      ctx.moveTo(rect.left, 0);
      ctx.lineTo(rect.left, ctx.canvas.height);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(rect.right, 0);
      ctx.lineTo(rect.right, ctx.canvas.height);
      ctx.stroke();
    });

    ctx.setLineDash([]);  // Reset line dash
  };

  const drawMeasurements = (ctx, elements) => {
    // Sort elements by their position (top to bottom, left to right)
    elements.sort((a, b) => {
      const rectA = a.getBoundingClientRect();
      const rectB = b.getBoundingClientRect();
      if (rectA.top !== rectB.top) return rectA.top - rectB.top;
      return rectA.left - rectB.left;
    });
  };

  const drawFigmaStyleBoxes = (ctx, elements) => {
    elements.forEach(element => {
      if (element.getClientRects) {
        const rects = element.getClientRects();
        for (let i = 0; i < rects.length; i++) {
          drawSingleRect(ctx, rects[i]);
        }
      } else {
        const rect = element.getBoundingClientRect();
        drawSingleRect(ctx, rect);
      }
    });
  };

  const drawSingleRect = (ctx, rect) => {
    // Draw main outline
    ctx.strokeStyle = '#2196F3'; // Figma blue color
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    ctx.strokeRect(rect.left, rect.top, rect.width, rect.height);

    // Draw corner handles
    const handleSize = 8;
    const corners = [
      { x: rect.left, y: rect.top },
      { x: rect.right, y: rect.top },
      { x: rect.left, y: rect.bottom },
      { x: rect.right, y: rect.bottom }
    ];

    corners.forEach(corner => {
      ctx.fillStyle = '#2196F3';
      ctx.fillRect(corner.x - handleSize / 2, corner.y - handleSize / 2, handleSize, handleSize);
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 1;
      ctx.strokeRect(corner.x - handleSize / 2, corner.y - handleSize / 2, handleSize, handleSize);
    });
  };

  const drawBoxModel = (ctx, element) => {
    const rect = element.getBoundingClientRect();
    const styles = window.getComputedStyle(element);
    
    const margin = {
      top: parseInt(styles.marginTop),
      right: parseInt(styles.marginRight),
      bottom: parseInt(styles.marginBottom),
      left: parseInt(styles.marginLeft)
    };
    
    const border = {
      top: parseInt(styles.borderTopWidth),
      right: parseInt(styles.borderRightWidth),
      bottom: parseInt(styles.borderBottomWidth),
      left: parseInt(styles.borderLeftWidth)
    };
    
    const padding = {
      top: parseInt(styles.paddingTop),
      right: parseInt(styles.paddingRight),
      bottom: parseInt(styles.paddingBottom),
      left: parseInt(styles.paddingLeft)
    };

    // Draw margin
    ctx.fillStyle = 'rgba(255, 165, 0, 0.5)'; // Orange
    ctx.fillRect(rect.left - margin.left, rect.top - margin.top, rect.width + margin.left + margin.right, margin.top); // Top
    ctx.fillRect(rect.right, rect.top, margin.right, rect.height); // Right
    ctx.fillRect(rect.left - margin.left, rect.bottom, rect.width + margin.left + margin.right, margin.bottom); // Bottom
    ctx.fillRect(rect.left - margin.left, rect.top, margin.left, rect.height); // Left

    // Draw border
    ctx.fillStyle = 'rgba(0, 128, 0, 0.5)'; // Green
    ctx.fillRect(rect.left - border.left, rect.top - border.top, rect.width + border.left + border.right, border.top); // Top
    ctx.fillRect(rect.right, rect.top, border.right, rect.height); // Right
    ctx.fillRect(rect.left - border.left, rect.bottom, rect.width + border.left + border.right, border.bottom); // Bottom
    ctx.fillRect(rect.left - border.left, rect.top, border.left, rect.height); // Left

    // Draw padding
    ctx.fillStyle = 'rgba(144, 238, 144, 0.5)'; // Light green
    ctx.fillRect(rect.left, rect.top, rect.width, padding.top); // Top
    ctx.fillRect(rect.right - padding.right, rect.top + padding.top, padding.right, rect.height - padding.top - padding.bottom); // Right
    ctx.fillRect(rect.left, rect.bottom - padding.bottom, rect.width, padding.bottom); // Bottom
    ctx.fillRect(rect.left, rect.top + padding.top, padding.left, rect.height - padding.top - padding.bottom); // Left

    // Draw content
    ctx.fillStyle = 'rgba(173, 216, 230, 0.5)'; // Light blue
    ctx.fillRect(
      rect.left + padding.left,
      rect.top + padding.top,
      rect.width - padding.left - padding.right,
      rect.height - padding.top - padding.bottom
    );

    // Check if the element has children
    if (element.children.length > 0) {
      const childRects = Array.from(element.children).map(child => {
        const rect = child.getBoundingClientRect();
        const styles = window.getComputedStyle(child);
        return {
          left: rect.left - parseInt(styles.marginLeft),
          right: rect.right + parseInt(styles.marginRight),
          top: rect.top - parseInt(styles.marginTop),
          bottom: rect.bottom + parseInt(styles.marginBottom)
        };
      });
      
      childRects.sort((a, b) => a.left - b.left);
      
      const parentRect = element.getBoundingClientRect();
      const parentStyles = window.getComputedStyle(element);
      const parentPaddingLeft = parseInt(parentStyles.paddingLeft);
      const parentPaddingRight = parseInt(parentStyles.paddingRight);
      const parentPaddingTop = parseInt(parentStyles.paddingTop);
      const parentPaddingBottom = parseInt(parentStyles.paddingBottom);
      
      const minGap = 1; // Minimum gap size to draw (in pixels)

      for (let i = 0; i <= childRects.length; i++) {
        let startX, endX;
        
        if (i === 0) {
          startX = parentRect.left + parentPaddingLeft;
          endX = childRects[0].left;
        } else if (i === childRects.length) {
          startX = childRects[i - 1].right;
          endX = parentRect.right - parentPaddingRight;
        } else {
          startX = childRects[i - 1].right;
          endX = childRects[i].left;
        }
        
        if (endX - startX >= minGap) {
          drawDashedLines(ctx, startX, endX, 
            parentRect.top + parentPaddingTop, 
            parentRect.bottom - parentPaddingBottom
          );
        }
      }
    }
  };

  const drawDashedLines = (ctx, startX, endX, startY, endY) => {
    // Semi-transparent purple background
    ctx.fillStyle = 'rgba(128, 0, 128, 0.3)';
    ctx.fillRect(startX, startY, endX - startX, endY - startY);

    // Black dots
    ctx.fillStyle = 'black';
    const dotSize = 1;
    const dotSpacing = 3;
    
    for (let x = startX; x < endX; x += dotSpacing) {
      for (let y = startY; y < endY; y += dotSpacing) {
        ctx.fillRect(x, y, dotSize, dotSize);
      }
    }
  };

  const handleMouseMove = (e) => {
    const overlay = overlayRef.current;
    const canvas = canvasRef.current;
    
    if (overlay) overlay.style.pointerEvents = 'none';
    const targetElement = document.elementFromPoint(e.clientX, e.clientY);
    if (overlay) overlay.style.pointerEvents = 'auto';
    
    if (targetElement && targetElement !== canvas && targetElement !== overlay) {
      const elementInfo = {
        element: targetElement,
        tagName: targetElement.tagName.toLowerCase(),
        classes: Array.from(targetElement.classList).join(' '),
        position: { x: e.clientX, y: e.clientY }
      };
      setHoveredElement(elementInfo);
    } else {
      setHoveredElement(null);
    }
  };

  const handleClick = (e) => {
    if (hoveredElement) {
      setSelectedElements(prev => {
        const element = hoveredElement.element;
        const isSelected = prev.includes(element);
        if (isSelected) {
          return prev.filter(el => el !== element);
        } else {
          return [...prev, element];
        }
      });
    }
  };

  return (
    <>
      {/* Sample content */}
      <div className="content-container">
        <h1 className="main-title">Figma-style Element Detector</h1>
        <p className="description">Move your mouse and click to select elements. Select multiple elements to see measurements.</p>
        
        <div className="button-container">
          <button className="primary-button" onClick={() => alert('selectedElements')}>
            Button 1
          </button>
          <button className="secondary-button">
            Button 2
          </button>
        </div>
        
        <div className="grid-container">
          <div className="grid-box">Box 1</div>
          <div className="grid-box">Box 2</div>
        </div>
        
        <p className="paragraph">
          This paragraph contains a{' '}
          <span className="highlight-span">
            multi-line span element to demonstrate how our detector handles 
            inline elements that wrap across multiple lines.
          </span>
          {' '}The text continues after the span.
        </p>
      </div>

      {/* Overlay with canvas */}
      <div 
        ref={overlayRef}
        className="overlay"
        onMouseMove={handleMouseMove}
        onClick={handleClick}
      >
        <canvas 
          ref={canvasRef}
          className="canvas-overlay"
        />
        {hoveredElement && (
          <div 
            className="hover-info"
            style={{
              left: hoveredElement.position.x + 10,
              top: hoveredElement.position.y + 10,
            }}
          >
            <div className="hover-info-tag">{hoveredElement.tagName}</div>
            {hoveredElement.classes && (
              <div className="hover-info-classes">{hoveredElement.classes}</div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

export default CanvasElementDetector;
