import './style.css';
import { registerBlockType } from "@wordpress/blocks";
import {
  Flex,
  FlexItem,
  TextControl,
  SelectControl,
  CheckboxControl,
} from "@wordpress/components";
import { useEffect, useReducer } from "@wordpress/element";
import apiFetch from "@wordpress/api-fetch";
import { useForm, Controller } from "react-hook-form";
import ReactDOM from "react-dom";

const reducer = (state, action) => {
  switch (action.type) {
    case "SET_POSTS":
      return {
        ...state,
        posts: action.payload.posts,
        maxPages: parseInt(action.payload.maxPages, 10),
        currentPage: parseInt(action.payload.currentPage, 10),
      };
    case "SET_PAGE":
      return {
        ...state,
        currentPage: parseInt(action.payload, 10),
      };
    case "SET_CATEGORIES":
      return { ...state, categories: action.payload };
    case "SET_TAGS":
      return { ...state, tags: action.payload };
    default:
      return state;
  }
};

const initialState = {
  posts: [],
  categories: [],
  tags: [],
  currentPage: 1,
  maxPages: 1,
};

const FilterBlock = () => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { control, handleSubmit, reset, getValues } = useForm({
    defaultValues: { keyword: "", category: "", tags: [] },
  });

  const fetchPosts = ({ keyword, category, tags }, page = 1) => {
    const tagSlugs = tags.map(tag => tag.slug).join(",");
    apiFetch({
      path: `/itc/v1/posts/?keyword=${keyword}&category=${category}&tags=${tagSlugs}&page=${page}`,
    }).then((response) => {
      dispatch({
        type: "SET_POSTS",
        payload: { ...response, currentPage: page },
      });
    });
  };

  const fetchCategories = () => {
    apiFetch({ path: "/wp/v2/categories?exclude=1" })
      .then((categories) => {
        dispatch({ type: "SET_CATEGORIES", payload: categories });
      })
      .catch((error) => {
        console.error("Error fetching categories:", error);
      });
  };

  const fetchTags = () => {
    apiFetch({ path: "/wp/v2/tags" })
      .then((tags) => {
        dispatch({ type: "SET_TAGS", payload: tags });
      })
      .catch((error) => {
        console.error("Error fetching tags:", error);
      });
  };

  useEffect(() => {
    fetchCategories();
    fetchTags();
    const params = new URLSearchParams(window.location.search);
    const keyword = params.get('q') || "";
    const category = params.get('cat') || "";
    const tags = params.getAll('tags[]').map(slug => ({ slug }));
    const page = parseInt(params.get('current-page'), 10) || 1;

    reset({ keyword, category, tags });
    fetchPosts({ keyword, category, tags }, page); 
}, []);

  const handlePageChange = (newPage) => {
    if (newPage !== state.currentPage) {
      dispatch({ type: "SET_PAGE", payload: newPage });
      const values = getValues();
      updateURL(values.keyword, values.category, values.tags, newPage);
      fetchPosts(values, newPage);
    }
  };

  const updateURL = (keyword, category, tags, page) => {
    const params = new URLSearchParams();
    if (keyword) params.set("q", keyword);
    if (category) params.set("cat", category);
    tags.forEach(tag => params.append("tags[]", tag.slug));
    if (page > 1) params.set("current-page", page);

    const newRelativePathQuery = `${window.location.pathname}?${params.toString()}`;
    window.history.pushState(null, "", newRelativePathQuery);
  };

  const onSubmit = (data) => {
    updateURL(data.keyword, data.category, data.tags, 1);
    fetchPosts(data, 1);
  };

  const { posts, categories, tags, maxPages, currentPage } = state;

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Flex wrap={true} className="filterControl" justify={"flex-start"}>
        <FlexItem className={"filterControl__item filterControl__item--keyword"}>
          <strong className="filterControl--tit">Keyword</strong>
          <Controller
            name="keyword"
            control={control}
            render={({ field }) => <TextControl {...field} />}
          />
        </FlexItem>
        <FlexItem className={"filterControl__item filterControl__item--categories"}>
          <strong className="filterControl--tit">Categories</strong>
          <Controller
            name="category"
            control={control}
            render={({ field }) => (
              <SelectControl
                {...field}
                options={[
                  { label: "Select a Category", value: "" },
                  ...categories.map(cat => ({
                    label: cat.name,
                    value: cat.slug,
                  })),
                ]}
              />
            )}
          />
        </FlexItem>
        <FlexItem className={"filterControl__item filterControl__item--tags"}>
          <strong className="filterControl--tit">Tags</strong>
          <Controller
            name="tags"
            control={control}
            render={({ field: { onChange, value } }) => (
              <Flex justify={"flex-start"}>
                {tags.map(tag => (
                  <CheckboxControl
                    key={tag.slug}
                    label={tag.name}
                    checked={value.some(v => v.slug === tag.slug)}
                    onChange={() => {
                      const newValue = value.some(v => v.slug === tag.slug)
                        ? value.filter(v => v.slug !== tag.slug)
                        : [...value, { slug: tag.slug }];
                      onChange(newValue);
                    }}
                  />
                ))}
              </Flex>
            )}
          />
        </FlexItem>
        <FlexItem className={"filterControl__item filterControl__item--submit"}>
          <button type="submit">Search</button>
        </FlexItem>
      </Flex>

      <div className="filterBlocks">
        {posts.map((post) => (
          <div key={post.id} className="filterBlock">
            <figure className="filterBlock__thumb">
              <img src={post.thumbnail_url || "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mPs7+m/CAAF2QJ9Ghl9ggAAAABJRU5ErkJggg=="} alt={post.name} width="150" height="150" />
            </figure>
            <div className="filterBlock__content">
              <strong className="filterBlock__content--tit">{post.name}</strong>
              <p className="filterBlock__content--des">{post.description}</p>
            </div>
          </div>
        ))}
      </div>

      {maxPages > 1 && (
        <div className="filterPagination">
          {Array.from({ length: maxPages }, (_, i) => (
            <button
              className={i + 1 === currentPage ? "active" : ""}
              key={i + 1}
              onClick={() => handlePageChange(i + 1)}
              disabled={currentPage === i + 1}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </form>
  );
};

registerBlockType("itc/itc-filter", {
  title: "ITC Filter",
  description: "A custom block to filter and display posts.",
  icon: "filter",
  category: "widgets",
  edit: FilterBlock,
  save: () => null,
});

document.addEventListener("DOMContentLoaded", function () {
  const root = document.getElementById("itcFilterBlocks");
  if (root) {
    ReactDOM.render(<FilterBlock />, root);
  }
});
