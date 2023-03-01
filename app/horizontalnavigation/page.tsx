import Link from "next/link";
import Image from "next/image";
import iconHome from "@/public/svg/home.svg";
import iconClose from "@/public/svg/close.svg";
import horNav1 from "@/public/svg/horizontal-navigation-1.svg";
import horNav2 from "@/public/svg/horizontal-navigation-2.svg";
import iconTabler from "@/public/svg/icon-tabler.svg";
import iconTablerMenu from "@/public/svg/icon-tabler-menu.svg";
import iconTablerMenu2 from "@/public/svg/icon-tabler-menu-2.svg";
import iconTablerGrid from "@/public/svg/icon-tabler-grid.svg";
import iconTablerPuzzle from "@/public/svg/icon-tabler-puzzle.svg";
import iconTablerChevronDown from "@/public/svg/icon-tabler-chevron-down.svg";
import iconTablerSearch from "@/public/svg/icon-tabler-search.svg";
import iconTablerCompass from "@/public/svg/icon-tabler-compass.svg";
import iconTablerBell from "@/public/svg/icon-tabler-bell.svg";
import iconTablerMessages from "@/public/svg/icon-tabler-messages.svg";
import iconTablerUser from "@/public/svg/icon-tabler-user.svg";
import iconTablerCode from "@/public/svg/icon-tabler-code.svg";
import iconTablerHelp from "@/public/svg/icon-tabler-help.svg";
import iconTablerSettings from "@/public/svg/icon-tabler-settings.svg";

export default function IndexPage() {
  // const [show, setShow] = useState(null);
  // const [profile, setProfile] = useState(false);
  // const [product, setProduct] = useState(false);
  // const [deliverables, setDeliverables] = useState(false);
  return (
    <>
      <div className="bg-gray-200 h-full w-full">
        {/* Code block starts */}
        <nav className="bg-white shadow xl:block hidden">
          <div className="mx-auto container px-6 py-2 xl:py-0">
            <div className="flex items-center justify-between">
              <div className="inset-y-0 left-0 flex items-center xl:hidden">
                <div className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-gray-100 focus:outline-none transition duration-150 ease-in-out">
                  <div className="visible xl:hidden">
                    <ul className="p-2 border-r bg-white absolute rounded left-0 right-0 shadow mt-8 md:mt-8 hidden">
                      <li className="flex xl:hidden cursor-pointer text-gray-600 text-sm leading-3 tracking-normal mt-2 py-2 hover:text-indigo-700 focus:text-indigo-700 focus:outline-none">
                        <div className="flex items-center">
                          <Image
                            className="icon icon-tabler icon-tabler-grid"
                            src={iconTablerGrid}
                            alt={"icon-tabler-grid"}
                            width={20}
                            height={20}
                          />
                          <span className="ml-2 font-bold">Dashboard</span>
                        </div>
                      </li>
                      <li className="flex xl:hidden flex-col cursor-pointer text-gray-600 text-sm leading-3 tracking-normal py-2 hover:text-indigo-700 focus:text-indigo-700 focus:outline-none flex justify-center">
                        <div className="flex items-center">
                          <Image
                            src={iconTablerPuzzle}
                            alt={"icon-tabler-puzzle"}
                            className="icon icon-tabler icon-tabler-puzzle"
                            width={20}
                            height={20}
                          />
                          <span className="ml-2 font-bold">Products</span>
                        </div>
                      </li>
                      <li className="flex xl:hidden cursor-pointer text-gray-600 text-sm leading-3 tracking-normal py-2 hover:text-indigo-700 flex items-center focus:text-indigo-700 focus:outline-none">
                        <Image
                          src={iconTablerCompass}
                          alt={"icon-tabler-compass"}
                          className="icon icon-tabler icon-tabler-compass"
                          width={20}
                          height={20}
                        />
                        <span className="ml-2 font-bold">Performance</span>
                      </li>
                      <li className="border-b border-gray-300 flex xl:hidden cursor-pointer text-gray-600 text-sm leading-3 tracking-normal pt-2 pb-4 hover:text-indigo-700 flex items-center focus:text-indigo-700 focus:outline-none">
                        <Image
                          src={iconTablerCode}
                          alt={"icon-tabler-code"}
                          className="icon icon-tabler icon-tabler-code"
                          width={20}
                          height={20}
                        />
                        <span className="ml-2 font-bold">Deliverables</span>
                      </li>
                      <li className="cursor-pointer text-gray-600 text-sm leading-3 tracking-normal mt-2 py-2 hover:text-indigo-700 flex items-center focus:text-indigo-700 focus:outline-none">
                        <div className="flex items-center">
                          <div className="w-12 cursor-pointer flex text-sm border-2 border-transparent rounded focus:outline-none focus:border-white transition duration-150 ease-in-out">
                            <Image
                              width={50}
                              height={50}
                              className="rounded h-10 w-10 object-cover"
                              src="https://tuk-cdn.s3.amazonaws.com/assets/components/horizontal_navigation/hn_1.png"
                              alt="logo"
                            />
                          </div>
                          <p className="text-sm ml-2 cursor-pointer">
                            Jane Doe
                          </p>
                          <div className="sm:ml-2 text-white relative">
                            <Image
                              src={iconTablerChevronDown}
                              alt={"icon-tabler-chevron-down"}
                              className="icon icon-tabler icon-tabler-chevron-down cursor-pointer"
                              width={16}
                              height={16}
                            />
                          </div>
                        </div>
                      </li>
                      <li className="cursor-pointer text-gray-600 text-sm leading-3 tracking-normal py-2 hover:text-indigo-700 focus:text-indigo-700 focus:outline-none">
                        <div className="flex items-center">
                          <Image
                            src={iconTablerUser}
                            alt={"icon-tabler-user"}
                            className="icon icon-tabler icon-tabler-user"
                            width={20}
                            height={20}
                          />
                          <span className="ml-2">Profile</span>
                        </div>
                      </li>
                    </ul>
                    <Image
                      src={iconTablerMenu}
                      alt={"icon-tabler-menu"}
                      // onclick="MenuHandler(this,true)"
                      className="show-m-menu icon icon-tabler icon-tabler-menu"
                      width={28}
                      height={28}
                      aria-haspopup="true"
                      aria-label="Main Menu"
                    />
                  </div>
                  <div
                    className="hidden close-m-menu text-gray-700"
                    // onclick="MenuHandler(this,false)"
                  >
                    <Image
                      src={iconClose}
                      alt={"icon-close"}
                      aria-label="Close"
                      width={24}
                      height={24}
                    />
                  </div>
                </div>
              </div>
              <div className="flex w-full sm:w-auto items-center sm:items-stretch justify-end sm:justify-start">
                <div className="flex items-center">
                  <Image
                    src={iconHome}
                    alt={"iconHome"}
                    height={40}
                    width={40}
                    aria-label="Home"
                  />
                  <h2 className="hidden sm:block text-base text-gray-700 font-bold leading-normal pl-3">
                    The North
                  </h2>
                </div>
              </div>
              <div className="flex">
                <div className="hidden xl:flex md:mr-6 xl:mr-16">
                  <Link
                    href="/"
                    className="flex px-5 items-center py-6 text-sm leading-5 text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none transition duration-150 ease-in-out"
                  >
                    <span className="mr-2">
                      <Image
                        className="icon icon-tabler icon-tabler-grid"
                        src={iconTablerGrid}
                        alt={"icon-tabler-grid"}
                        width={20}
                        height={20}
                      />
                    </span>
                    Dashboard
                  </Link>
                  <Link
                    href="/"
                    className="flex px-5 items-center py-6 text-sm leading-5 text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none transition duration-150 ease-in-out"
                  >
                    <span className="mr-2">
                      <Image
                        src={iconTablerPuzzle}
                        alt={"icon-tabler-puzzle"}
                        className="icon icon-tabler icon-tabler-puzzle"
                        width={20}
                        height={20}
                      />
                    </span>
                    Products
                  </Link>
                  <Link
                    href="/"
                    className="flex px-5 items-center py-6 text-sm leading-5 text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none transition duration-150 ease-in-out"
                  >
                    <span className="mr-2">
                      <Image
                        src={iconTablerCompass}
                        alt={"icon-tabler-compass"}
                        className="icon icon-tabler icon-tabler-compass"
                        width={20}
                        height={20}
                      />
                    </span>
                    Performance
                  </Link>
                  <Link
                    href="/"
                    className="flex px-5 items-center py-6 text-sm leading-5 text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none transition duration-150 ease-in-out"
                  >
                    <span className="mr-2">
                      <Image
                        src={iconTablerCode}
                        alt={"icon-tabler-code"}
                        className="icon icon-tabler icon-tabler-code"
                        width={20}
                        height={20}
                      />
                    </span>
                    Deliverables
                  </Link>
                </div>
                <div className="hidden xl:flex items-center">
                  <div className="relative md:mr-6 my-2">
                    <button className="focus:outline-none bg-gray-100 border-gray-300 border transition duration-150 ease-in-out hover:bg-gray-300 rounded text-gray-600 px-5 py-2 text-xs">
                      Manage
                    </button>
                  </div>
                  <div className="ml-6 relative">
                    <div
                      className="flex items-center relative"
                      // onClick={() => setProfile(!profile)}
                    >
                      {/*{profile && (*/}
                      <ul className="p-2 w-40 border-r bg-white absolute rounded right-0 shadow top-0 mt-16 ">
                        <li className="cursor-pointer text-gray-600 text-sm leading-3 tracking-normal py-2 hover:text-indigo-700 focus:text-indigo-700 focus:outline-none">
                          <div className="flex items-center">
                            <Image
                              src={iconTablerUser}
                              alt={"icon-tabler-user"}
                              className="icon icon-tabler icon-tabler-user"
                              width={20}
                              height={20}
                            />
                            <span className="ml-2">My Profile</span>
                          </div>
                        </li>
                        <li className="cursor-pointer text-gray-600 text-sm leading-3 tracking-normal mt-2 py-2 hover:text-indigo-700 focus:text-indigo-700 focus:outline-none flex items-center">
                          <Image
                            src={iconTablerHelp}
                            alt={"icon-tabler-help"}
                            className="icon icon-tabler icon-tabler-help"
                            width={20}
                            height={20}
                          />
                          <span className="ml-2">Help Center</span>
                        </li>
                        <li className="cursor-pointer text-gray-600 text-sm leading-3 tracking-normal mt-2 py-2 hover:text-indigo-700 flex items-center focus:text-indigo-700 focus:outline-none">
                          <Image
                            src={iconTablerSettings}
                            alt={"icon-tabler-settings"}
                            className="icon icon-tabler icon-tabler-settings"
                            width={20}
                            height={20}
                          />
                          <span className="ml-2">Account Settings</span>
                        </li>
                      </ul>
                      {/*)}*/}
                      <div className="cursor-pointer flex text-sm border-2 border-transparent rounded-full focus:outline-none focus:border-white transition duration-150 ease-in-out">
                        <Image
                          width={50}
                          height={50}
                          className="rounded-full h-10 w-10 object-cover"
                          src="https://tuk-cdn.s3.amazonaws.com/assets/components/horizontal_navigation/hn_2.png"
                          alt="logo"
                        />
                      </div>
                      <div className="ml-2 text-gray-600">
                        <Image
                          src={iconTablerChevronDown}
                          alt={"icon-tabler-chevron-down"}
                          className="icon icon-tabler icon-tabler-chevron-down cursor-pointer"
                          width={16}
                          height={16}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </nav>
        <nav>
          <div className="py-4 px-6 w-full flex xl:hidden justify-between items-center bg-white fixed top-0 z-40">
            <div className="w-24">
              <Image src={horNav1} alt={"hor-nav-1"} width={43} height={44} />
            </div>
            <div className="flex items-center">
              <div className="relative mr-6 ">
                <button className="focus:outline-none bg-gray-100 border-gray-300 border transition duration-150 ease-in-out hover:bg-gray-300 rounded text-gray-600 px-5 py-2 text-xs">
                  Manage
                </button>
              </div>
              <div
                id="menu"
                className="text-gray-800"
                // onClick={() => setShow(!show)}
              >
                {/*{show ? (*/}
                {/*  ""*/}
                {/*) : (*/}
                <Image
                  src={iconTablerMenu2}
                  alt={"icon-tabler-menu-2"}
                  className="icon icon-tabler icon-tabler-menu-2"
                  width={24}
                  height={24}
                />
                {/*)}*/}
              </div>
            </div>
          </div>
          {/*Mobile responsive sidebar*/}
          <div
            className={
              "w-full xl:hidden h-full absolute z-40  transform  translate-x-full"
            }
            //   show
            //     ? "w-full xl:hidden h-full absolute z-40  transform  translate-x-0 "
            //     : "   w-full xl:hidden h-full absolute z-40  transform -translate-x-full"
            // }
          >
            <div
              className="bg-gray-800 opacity-50 w-full h-full"
              // onClick={() => setShow(!show)}
            />
            <div className="w-64 z-40 fixed overflow-y-auto z-40 top-0 bg-white shadow h-full flex-col justify-between xl:hidden pb-4 transition duration-150 ease-in-out">
              <div className="px-6 h-full">
                <div className="flex flex-col justify-between h-full w-full">
                  <div>
                    <div className="mt-6 flex w-full items-center justify-between">
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center">
                          <Image
                            src={horNav2}
                            alt={"hor-nav-2"}
                            width={43}
                            height={44}
                          />
                          <p className="text-base md:text-2xl text-gray-800 ml-3">
                            The North
                          </p>
                        </div>
                        <div
                          id="cross"
                          className="text-gray-800"
                          // onClick={() => setShow(!show)}
                        >
                          <Image
                            className="icon icon-tabler icon-tabler-x"
                            src={iconTabler}
                            alt={"icon-tabler"}
                            width="24"
                            height="24"
                          />
                        </div>
                      </div>
                    </div>
                    <ul className="f-m-m">
                      <Link href={"/"} className="cursor-pointer">
                        <li className="text-gray-800 pt-10">
                          <div className="flex items-center">
                            <div className="w-6 h-6 md:w-8 md:h-8 text-indigo-700">
                              <Image
                                className="icon icon-tabler icon-tabler-grid"
                                src={iconTablerGrid}
                                alt={"icon-tabler-grid"}
                                width={20}
                                height={20}
                              />
                            </div>
                            <p className="text-indigo-700 xl:text-base text-base ml-3">
                              Dashboard
                            </p>
                          </div>
                        </li>
                      </Link>
                      <Link href={"/"} className="cursor-pointer">
                        <li className="text-gray-800 pt-8">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="w-6 h-6 md:w-8 md:h-8 text-gray-800">
                                <Image
                                  src={iconTablerPuzzle}
                                  alt={"icon-tabler-puzzle"}
                                  className="icon icon-tabler icon-tabler-puzzle"
                                  width={20}
                                  height={20}
                                />
                              </div>
                              <p className="text-gray-800 xl:text-base md:text-2xl text-base ml-3">
                                Products
                              </p>
                            </div>
                          </div>
                        </li>
                      </Link>
                      <Link href={"/"} className="cursor-pointer">
                        <li className="text-gray-800 pt-8">
                          <div className="flex items-center">
                            <div className="w-6 h-6 md:w-8 md:h-8 text-gray-800">
                              <Image
                                src={iconTablerCompass}
                                alt={"icon-tabler-compass"}
                                className="icon icon-tabler icon-tabler-compass"
                                width={20}
                                height={20}
                              />
                            </div>
                            <p className="text-gray-800 xl:text-base md:text-2xl text-base ml-3">
                              Performance
                            </p>
                          </div>
                        </li>
                      </Link>
                      <li className="text-gray-800 pt-8 cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="w-6 h-6 md:w-8 md:h-8 text-gray-800">
                              <Image
                                src={iconTablerCode}
                                alt={"icon-tabler-code"}
                                className="icon icon-tabler icon-tabler-code"
                                width={20}
                                height={20}
                              />
                            </div>
                            <p className="text-gray-800 xl:text-base md:text-2xl text-base ml-3">
                              Deliverables
                            </p>
                          </div>
                        </div>
                      </li>
                    </ul>
                  </div>
                  <div className="w-full pt-4">
                    <div className="flex justify-center mb-4 w-full">
                      <div className="relative w-full">
                        <div className="text-gray-500 absolute ml-4 inset-0 m-auto w-4 h-4">
                          <Image
                            src={iconTablerSearch}
                            alt={"icon-tabler-search"}
                            className="icon icon-tabler icon-tabler-search"
                            width={16}
                            height={16}
                          />
                        </div>
                        <input
                          className="bg-gray-100 focus:outline-none rounded w-full text-sm text-gray-500  pl-10 py-2"
                          type="text"
                          placeholder="Search"
                        />
                      </div>
                    </div>
                    <div className="border-t border-gray-300">
                      <div className="w-full flex items-center justify-between pt-1">
                        <div className="flex items-center">
                          <Image
                            width={50}
                            height={50}
                            alt="profile-pic"
                            src="https://tuk-cdn.s3.amazonaws.com/assets/components/boxed_layout/bl_1.png"
                            className="w-8 h-8 rounded-md"
                          />
                          <p className=" text-gray-800 text-base leading-4 ml-2">
                            Jane Doe
                          </p>
                        </div>
                        <ul className="flex">
                          <li className="cursor-pointer text-gray-800 pt-5 pb-3">
                            <div className="w-6 h-6 md:w-8 md:h-8">
                              <Image
                                src={iconTablerMessages}
                                alt={"icon-tabler-messages"}
                                className="icon icon-tabler icon-tabler-messages"
                                width={24}
                                height={24}
                              />
                            </div>
                          </li>
                          <li className="cursor-pointer text-gray-800 pt-5 pb-3 pl-3">
                            <div className="w-6 h-6 md:w-8 md:h-8">
                              <Image
                                src={iconTablerBell}
                                alt={"icon-tabler-bell"}
                                className="icon icon-tabler icon-tabler-bell"
                                width={28}
                                height={28}
                              />
                            </div>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </nav>
        {/* Code block ends */}
      </div>
    </>
  );
}
