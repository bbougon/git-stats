export interface Repository<T> {
  persist(entity: T);
}
