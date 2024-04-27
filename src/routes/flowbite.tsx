import Modal from "~/components/Modal";

const Flowbite = () => {
  return (
    <main class="justify-center text-center mx-auto text-gray-700 p-4">
      <h1 class="max-6-xs text-6xl text-sky-700 font-thin uppercase my-16">
        <a
          class="text-4xl text-blue-600"
          href="https://github.com/solidjs/solid"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn Solid, Tailwind CSS and Flowbite
        </a>
      </h1>
      <button
        data-modal-target="defaultModal"
        data-modal-toggle="defaultModal"
        class="mt-4 text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
        type="button"
      >
        Toggle Flowbite modal
      </button>
      <div
        id="tooltip-default"
        role="tooltip"
        class="absolute z-10 invisible inline-block px-3 py-2 text-sm font-medium text-white transition-opacity duration-300 bg-gray-900 rounded-lg shadow-sm opacity-0 tooltip dark:bg-gray-700"
      >
        Toggle modal component
        <div class="tooltip-arrow" data-popper-arrow></div>
      </div>

      <Modal />
    </main>
  );
};

export default Flowbite;
