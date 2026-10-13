import { useState } from "react";
import ProductList from "./components/ProductList";
import ProductDetail from "./components/ProductDetail";

type View = { page: "list" } | { page: "detail"; productId: string };

function App() {
  const [view, setView] = useState<View>({ page: "list" });

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title" onClick={() => setView({ page: "list" })}>
          E-Commerce Platform ahmed 06:33
        </h1>
      </header>

      <main className="app__main">
        {view.page === "list" && (
          <ProductList
            onSelectProduct={(id) => setView({ page: "detail", productId: id })}
          />
        )}
        {view.page === "detail" && (
          <ProductDetail
            productId={view.productId}
            onBack={() => setView({ page: "list" })}
          />
        )}
      </main>
    </div>
  );
}

export default App;