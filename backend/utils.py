import cv2

def process_image(img, results, model):
    detections = []
    occupied = 0
    available = 0

    for r in results:
        for box in r.boxes:
            conf = float(box.conf[0])
            label = model.names[int(box.cls[0])].lower()

            x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())

            if "occupied" in label:
                occupied += 1
                color = (0, 0, 255)
            else:
                available += 1
                color = (0, 255, 0)

            cv2.rectangle(img, (x1, y1), (x2, y2), color, 2)
            cv2.putText(img, f"{label} {conf:.2f}", (x1, y1 - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

            detections.append({
                "label": label,
                "confidence": round(conf, 2),
                "bbox": [x1, y1, x2, y2]
            })

    return img, detections, occupied, available