import { api } from "../api";

export async function getRooms() {
  const { data } = await api.get("/rooms");
  return data;
}

export async function createRoom(payload) {
  const { data } = await api.post("/rooms", payload);
  return data;
}

export async function updateRoom(roomId, payload) {
  const { data } = await api.put(`/rooms/${roomId}`, payload);
  return data;
}

export async function addRoomBed(roomId, payload) {
  const { data } = await api.post(`/rooms/${roomId}/bed`, payload);
  return data;
}

export async function updateRoomBed(roomId, bedNo, payload) {
  const { data } = await api.put(`/rooms/${roomId}/bed/${bedNo}`, payload);
  return data;
}
